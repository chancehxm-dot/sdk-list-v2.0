/**
 * 11-点击任务追踪器
 *
 * 继承 BaseTracker，处理"点击目标元素 N 次"类型的任务。
 *
 * 核心机制：
 *   1. 事件代理 — 在 document 上捕获 click（或 video 的 ended）事件
 *   2. 选择器匹配 — 用 closest() 判断点击目标是否匹配预设 CSS 选择器
 *   3. 可见性检查 — 只统计可见元素的点击
 *   4. ad-shield 拦截 — 根据 cb 参数的概率随机忽略点击
 *   5. 进度持久化 — 每次点击都写入 localStorage，刷新页面可恢复
 *   6. DOM 观察 — 如果目标元素尚未渲染，用 MutationObserver 等待
 *   7. 高亮提示 — 给匹配元素添加橙色呼吸动画
 *   8. 完成跳转 — 达到阈值后，自动跳转到目标链接或完成回调
 *
 * 页面卸载保护：
 *   如果用户已点击足够次数但尚未触发 complete，
 *   在 pagehide 事件中自动发送 final report。
 */
;(function(M) {
    "use strict";

    var BaseTracker     = M.BaseTracker;
    var inherit         = M.inherit;
    var CLICK_SELECTORS = M.CLICK_SELECTORS;
    var saveClickCount  = M.saveClickCount;
    var loadClickCount  = M.loadClickCount;
    var clearClickCount = M.clearClickCount;
    var showToast       = M.showToast;
    var t               = M.t;
    var taskLabel       = M.taskLabel;

    /** 高亮 CSS 是否已注入 */
    var highlightCSSInjected = false;

    // ================================================================
    // 构造函数
    // ================================================================

    /**
     * @param {Object} params   - 任务参数
     * @param {Object} adapter  - 适配器
     * @param {string} [testSign] - 测试签名
     */
    function ClickTracker(params, adapter, testSign) {
        // 调用父类构造函数
        BaseTracker.call(this, params, adapter, testSign);

        /** 已点击次数 */
        this.count         = 0;

        /** MutationObserver 实例（用于等待目标元素出现） */
        this.observer      = null;

        /** 当前高亮的 DOM 元素列表 */
        this.highlightEls  = [];

        /** toast 关闭函数引用 */
        this.dismissToast  = null;

        /** pagehide 事件回调引用 */
        this.unloadGuard   = null;

        /** 目标元素 CSS 选择器列表 */
        this.selectors     = CLICK_SELECTORS[params.type] || [];

        /**
         * 监听的事件类型
         * 视频类任务监听 "ended"（播放完毕），其余监听 "click"
         */
        this.eventName     = params.type === "video_click" ? "ended" : "click";

        // 绑定文档事件处理器（闭包保持 this 引用）
        var self = this;
        this.onDocumentEvent = function(evt) {
            if (self.completed) { return; }

            var target = evt.target;
            if (!target) { return; }

            // 找最近的匹配元素
            var match = self.closestMatch(target);
            if (!match || !self.isVisible(match)) { return; }

            // ad-shield 概率拦截
            if (self.cb > 0 && Math.floor(100 * Math.random()) < self.cb) {
                return;
            }

            self.count++;
            saveClickCount(self.params.t_id, self.count);
            self.updateProgressToast();

            // 达到阈值 → 完成任务
            if (self.count >= self.threshold) {
                evt.preventDefault();
                evt.stopPropagation();
                evt.stopImmediatePropagation();

                clearClickCount(self.params.t_id);
                self.clearHighlight();
                self.showCompleteToast();

                var navHref = self.resolveNavHref(match);
                self.completeAndNavigate(navHref);
            }
        };
    }

    // 原型链继承
    inherit(ClickTracker, BaseTracker);

    // ================================================================
    // 生命周期
    // ================================================================

    /**
     * 启动追踪器
     * 1. 注入高亮 CSS（全局一次）
     * 2. 恢复之前的点击计数
     * 3. 绑定事件监听
     * 4. 显示初始提示
     */
    ClickTracker.prototype.start = function() {
        injectHighlightCSS();

        this.count = loadClickCount(this.params.t_id);
        document.addEventListener(this.eventName, this.onDocumentEvent, true);
        this.setupUnloadGuard();
        this.checkDom();
        this.showInitialHint();
    };

    /**
     * 销毁追踪器
     * 清理所有监听器、观察器、高亮和 toast
     */
    ClickTracker.prototype.destroy = function() {
        document.removeEventListener(this.eventName, this.onDocumentEvent, true);
        this.teardownUnloadGuard();
        if (this.dismissToast) { this.dismissToast(); }
        this.clearHighlight();
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    };

    // ================================================================
    // Toast 提示
    // ================================================================

    /**
     * 根据当前状态显示初始提示
     * 有匹配元素 → 高亮 + 提示"点击 X 完成任务"
     * 有历史进度 → 提示"已点击 N/M — 请继续"
     * 无匹配元素 → 警告"请在页面中找到 X 并点击"
     */
    ClickTracker.prototype.showInitialHint = function() {
        var label = taskLabel(this.params.type);

        if (this.hasMatch()) {
            // 高亮所有可见的匹配元素
            this.highlightEls = this.allVisibleMatches();
            for (var i = 0; i < this.highlightEls.length; i++) {
                this.highlightEls[i].classList.add("__tsk_hl__");
            }

            // 2.2 秒后清除高亮
            if (this.highlightEls.length > 0) {
                var self = this;
                setTimeout(function() { self.clearHighlight(); }, 2200);
            }

            if (this.count > 0) {
                // 有历史进度
                this.dismissToast = showToast(
                    t("click_restored", this.count, this.threshold),
                    { duration: 2500 }
                );
            } else {
                // 首次进入
                this.dismissToast = showToast(
                    t("click_start", label, 0, this.threshold),
                    { duration: 3500 }
                );
            }
        } else {
            // 找不到目标元素
            this.dismissToast = showToast(
                t("click_no_target", label),
                { duration: 4000, type: "warn" }
            );
        }
    };

    /** 更新进度提示 */
    ClickTracker.prototype.updateProgressToast = function() {
        if (this.dismissToast) { this.dismissToast(); }
        if (this.completed) { return; }
        this.dismissToast = showToast(
            t("click_progress", this.count, this.threshold),
            { duration: 2000 }
        );
    };

    /** 显示完成提示 */
    ClickTracker.prototype.showCompleteToast = function() {
        if (this.dismissToast) { this.dismissToast(); }
        showToast(t("task_done"), { duration: 2500, type: "success" });
    };

    // ================================================================
    // 高亮管理
    // ================================================================

    /** 清除所有高亮 */
    ClickTracker.prototype.clearHighlight = function() {
        for (var i = 0; i < this.highlightEls.length; i++) {
            this.highlightEls[i].classList.remove("__tsk_hl__");
        }
        this.highlightEls = [];
    };

    // ================================================================
    // 链接解析与导航
    // ================================================================

    /**
     * 从被点击元素向上查找导航目标链接
     *
     * 查找优先级：
     *   1. 最近的 <a href="...">
     *   2. 最近的 [data-href] 或 [data-url] 属性
     *
     * @param   {HTMLElement} el - 被点击的元素
     * @returns {string|null} 链接 URL
     */
    ClickTracker.prototype.resolveNavHref = function(el) {
        // 优先查标准链接
        var link = el.closest("a[href]");
        if (link) {
            var href = link.getAttribute("href") || "";
            if (href && href.indexOf("javascript:") !== 0 && href !== "#") {
                return link.href;
            }
        }

        // 其次查 data 属性
        var dataEl = el.closest("[data-href], [data-url]");
        if (dataEl) {
            return dataEl.getAttribute("data-href") || dataEl.getAttribute("data-url");
        }

        return null;
    };

    /**
     * 完成任务 → 上报 → 延迟 300ms 跳转
     *
     * 延迟 300ms 的原因：给 final report 的 beacon 争取发送时间
     *
     * @param {string|null} navHref - 跳转目标 URL
     */
    ClickTracker.prototype.completeAndNavigate = function(navHref) {
        var self = this;
        this.onComplete({ clickCount: this.count }).then(function() {
            if (navHref) {
                setTimeout(function() {
                    window.location.href = navHref;
                }, 300);
            }
        }).catch(function() {
            // 即使上报失败，也要跳转
            if (navHref) {
                setTimeout(function() {
                    window.location.href = navHref;
                }, 300);
            }
        });
    };

    // ================================================================
    // DOM 查询
    // ================================================================

    /**
     * 判断给定的 DOM 元素是否匹配任意目标选择器
     * 使用 closest() 方法向上遍历 DOM 树
     *
     * @param   {HTMLElement} el - 事件目标元素
     * @returns {HTMLElement|null} 匹配的元素
     */
    ClickTracker.prototype.closestMatch = function(el) {
        for (var i = 0; i < this.selectors.length; i++) {
            try {
                var match = el.closest(this.selectors[i]);
                if (match) { return match; }
            } catch (e) {}
        }
        return null;
    };

    /**
     * 综合判断元素是否"可见"
     * 条件：display ≠ none、visibility ≠ hidden、opacity > 0、有实际尺寸
     *
     * @param   {HTMLElement} el
     * @returns {boolean}
     */
    ClickTracker.prototype.isVisible = function(el) {
        var cs   = window.getComputedStyle(el);
        var rect = el.getBoundingClientRect();
        return cs.display    !== "none"   &&
               cs.visibility !== "hidden" &&
               parseFloat(cs.opacity) > 0 &&
               rect.width  > 0 &&
               rect.height > 0;
    };

    /**
     * 获取页面中所有可见的匹配元素
     * @returns {HTMLElement[]}
     */
    ClickTracker.prototype.allVisibleMatches = function() {
        var result = [];
        var self   = this;
        for (var i = 0; i < this.selectors.length; i++) {
            try {
                var nodes = document.querySelectorAll(this.selectors[i]);
                for (var j = 0; j < nodes.length; j++) {
                    if (this.isVisible(nodes[j])) {
                        result.push(nodes[j]);
                    }
                }
            } catch (e) {}
        }
        return result;
    };

    /**
     * 页面中是否存在至少一个匹配元素
     * @returns {boolean}
     */
    ClickTracker.prototype.hasMatch = function() {
        for (var i = 0; i < this.selectors.length; i++) {
            try {
                if (document.querySelector(this.selectors[i])) {
                    return true;
                }
            } catch (e) {}
        }
        return false;
    };

    // ================================================================
    // DOM 观察器 — 等待目标元素出现
    // ================================================================

    /** 检查 DOM，不匹配则启动观察器 */
    ClickTracker.prototype.checkDom = function() {
        if (!this.hasMatch()) {
            this.startObserver();
        }
    };

    /**
     * 使用 MutationObserver 监听 DOM 变化
     * 一旦匹配元素出现，立即重新显示提示
     */
    ClickTracker.prototype.startObserver = function() {
        if (this.observer) { return; }

        var self = this;
        this.observer = new MutationObserver(function() {
            if (self.hasMatch()) {
                if (self.observer) { self.observer.disconnect(); }
                self.observer = null;
                self.showInitialHint();
            }
        });

        this.observer.observe(document.documentElement, {
            childList: true,
            subtree:   true
        });
    };

    // ================================================================
    // 页面卸载保护
    // ================================================================

    /**
     * 注册 pagehide 事件：
     * 如果用户已点击足够次数，在离开页面时自动发送 complete 上报
     */
    ClickTracker.prototype.setupUnloadGuard = function() {
        var self = this;
        this.unloadGuard = function() {
            if (self.completed) { return; }
            if (self.count >= self.threshold) {
                clearClickCount(self.params.t_id);
                self.clearHighlight();
                self.reporter.complete();
            }
        };
        window.addEventListener("pagehide", this.unloadGuard);
    };

    /** 移除 pagehide 事件 */
    ClickTracker.prototype.teardownUnloadGuard = function() {
        if (this.unloadGuard) {
            window.removeEventListener("pagehide", this.unloadGuard);
            this.unloadGuard = null;
        }
    };

    // ================================================================
    // CSS 注入（私有工具函数）
    // ================================================================

    /**
     * 注入高亮样式（全局执行一次）
     *
     * 高亮效果：橙色呼吸动画 + 圆角 outline
     * 动画持续 2 轮（0.9s × 2 = 1.8s）
     */
    function injectHighlightCSS() {
        if (highlightCSSInjected) { return; }
        highlightCSSInjected = true;

        var css = [
            '.__tsk_hl__{',
                'animation:__tsk_hl_pulse__ 0.9s ease-in-out 2;',
            '}',
            '@keyframes __tsk_hl_pulse__{',
                '0%{',
                    'box-shadow:0 0 0 0 rgba(255,152,0,0.6);',
                    'outline:3px solid rgba(255,152,0,0.55);',
                '}',
                '50%{',
                    'box-shadow:0 0 0 10px rgba(255,152,0,0);',
                    'outline:3px solid rgba(255,152,0,0.15);',
                '}',
                '100%{',
                    'box-shadow:0 0 0 0 rgba(255,152,0,0);',
                    'outline:3px solid rgba(255,152,0,0);',
                '}',
            '}',
            '.__tsk_hl__{',
                'outline:3px solid rgba(255,152,0,0);',
                'transition:outline .35s;',
                'border-radius:2px;',
            '}'
        ].join("");

        var style = document.createElement("style");
        style.textContent = css;
        document.head.appendChild(style);
    }

    // ---- 导出 ----
    M.ClickTracker = ClickTracker;

})(window.__TaskHostSDK__ = window.__TaskHostSDK__ || {});
