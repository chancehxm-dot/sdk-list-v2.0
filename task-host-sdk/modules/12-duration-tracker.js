/**
 * 12-停留任务追踪器
 *
 * 继承 BaseTracker，处理"在目标页面停留 N 秒"类型的任务。
 *
 * 核心机制：
 *   1. 定时器 — 每 500ms tick 一次，检查是否达到阈值
 *   2. 页面可见性感知 — 切换标签页时自动暂停/恢复计时
 *   3. pagehide 保护 — 页面隐藏时记录暂停开始时间
 *   4. 进度持久化 — 每 tick 写入 localStorage，刷新后可恢复
 *   5. 圆形倒计时徽章 — 右下角显示剩余时间
 *   6. Toast 提示 — 开始、恢复、完成等状态提示
 *   7. 滚动验证 — 文章/小说类任务需要滚动到页面 60%
 *   8. 延迟启动 — 支持 start_selector 参数，点击指定元素后开始计时
 *
 * 页面判定：
 *   通过 STAY_SELECTORS 配置的 CSS 选择器判断当前页面是否为"目标页面"
 *   不在目标页面时显示警告提示，不启动计时器
 *
 * 计时公式：
 *   elapsed = Date.now() - startedAt - pausedAccumulated - currentPause
 *   其中 currentPause 仅在 isVisible=false 时额外减去
 */
;(function(M) {
    "use strict";

    var BaseTracker       = M.BaseTracker;
    var inherit           = M.inherit;
    var STAY_SELECTORS    = M.STAY_SELECTORS;
    var saveDurationState  = M.saveDurationState;
    var loadDurationState  = M.loadDurationState;
    var clearDurationState = M.clearDurationState;
    var showToast         = M.showToast;
    var createBadge       = M.createBadge;
    var t                 = M.t;
    var taskLabel         = M.taskLabel;

    /** 计时器 tick 间隔（毫秒） */
    var TICK_MS = 500;

    // ================================================================
    // 构造函数
    // ================================================================

    /**
     * @param {Object} params   - 任务参数
     * @param {Object} adapter  - 适配器
     * @param {string} [testSign] - 测试签名
     */
    function DurationTracker(params, adapter, testSign) {
        BaseTracker.call(this, params, adapter, testSign);

        /** 暂停期间的累计毫秒数 */
        this.pausedAccumulated = 0;

        /** 当前暂停开始的时间戳（0 表示未暂停） */
        this.pauseStartedAt    = 0;

        /** 页面当前是否可见 */
        this.isVisible         = true;

        /** setInterval 定时器句柄 */
        this.timer             = null;

        /** 圆形倒计时徽章实例 */
        this.badge             = null;

        /**
         * 延迟启动选择器
         * 如果设置，用户必须先点击匹配的元素才会开始计时
         */
        this.startSelector     = params.start_selector || null;

        /** 延迟启动点击监听器引用 */
        this.startClickListener = null;

        // 绑定事件处理器（闭包保持 this 引用）
        var self = this;

        /**
         * pagehide 事件处理：
         * 页面被隐藏时记录暂停起点，并持久化当前进度
         */
        this.onPageHide = function() {
            if (self.isVisible) {
                self.isVisible      = false;
                self.pauseStartedAt = Date.now();
            }
            self.persistDuration();
        };

        /**
         * visibilitychange 事件处理：
         * 标签页切换时自动暂停/恢复
         * document.hidden === true  → 暂停
         * document.hidden === false → 恢复（如果之前是可见的）
         */
        this.onVisibility = function() {
            if (document.hidden) {
                // 隐藏 → 暂停
                if (!self.isVisible) { return; }
                self.isVisible      = false;
                self.pauseStartedAt = Date.now();
                self.persistDuration();
                self.updateBadge();
            } else {
                // 显示 → 恢复
                if (self.isVisible) { return; }
                self.isVisible = true;
                if (self.pauseStartedAt > 0) {
                    self.pausedAccumulated += Date.now() - self.pauseStartedAt;
                    self.pauseStartedAt = 0;
                }
                self.updateBadge();
            }
        };

        // ---- 恢复之前保存的进度 ----
        var saved = loadDurationState(params.t_id);
        if (saved) {
            this.startedAt         = saved.startedAt;
            this.pausedAccumulated = saved.pausedAccumulated;
        } else {
            this.startedAt = Date.now();
        }

        /**
         * 滚动比例要求（0~1）
         * 文章和小说类任务要求用户滚动到页面 60% 才算"真正看完"
         */
        var taskType = params.type;
        this.requireScroll = (taskType === "news_stay" || taskType === "novel_stay") ? 0.6 : 0;
    }

    // 原型链继承
    inherit(DurationTracker, BaseTracker);

    // ================================================================
    // 生命周期
    // ================================================================

    /**
     * 启动追踪器
     *
     * 流程：
     *   1. 检查是否在目标页面 → 不在则显示警告
     *   2. 如果配置了 start_selector 且不是恢复场景 → 等待用户点击
     *   3. 否则直接开始计时
     */
    DurationTracker.prototype.start = function() {
        if (!this.isOnTargetPage()) {
            showToast(
                t("dur_wrong_page", taskLabel(this.params.type), this.threshold),
                { duration: 5000, type: "warn" }
            );
            return;
        }

        var saved = loadDurationState(this.params.t_id);
        if (!this.startSelector || saved) {
            this.doStart(!!saved);
        } else {
            this.pendClickStart();
        }
    };

    /**
     * 销毁追踪器
     */
    DurationTracker.prototype.destroy = function() {
        window.removeEventListener("pagehide", this.onPageHide);
        this.teardownStartClickListener();

        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }

        document.removeEventListener("visibilitychange", this.onVisibility);

        if (this.badge) { this.badge.destroy(); }
        this.badge = null;
    };

    // ================================================================
    // 延迟启动
    // ================================================================

    /**
     * 等待用户点击 start_selector 指定的元素
     * 显示提示"点击 X 开始计时"
     */
    DurationTracker.prototype.pendClickStart = function() {
        showToast(
            t("dur_click_start", taskLabel(this.params.type), this.threshold),
            { duration: 5000, type: "warn" }
        );

        var self = this;
        this.startClickListener = function(evt) {
            var target = evt.target;
            if (!target) { return; }

            // 检查是否匹配 start_selector
            try {
                if (!target.closest(self.startSelector)) { return; }
            } catch (e) {
                return;
            }

            self.teardownStartClickListener();
            self.doStart(false);
        };

        document.addEventListener("click", this.startClickListener, true);
    };

    /** 移除延迟启动的点击监听器 */
    DurationTracker.prototype.teardownStartClickListener = function() {
        if (this.startClickListener) {
            document.removeEventListener("click", this.startClickListener, true);
            this.startClickListener = null;
        }
    };

    // ================================================================
    // 计时核心
    // ================================================================

    /**
     * 开始/恢复计时
     *
     * 初始化定时器、监听页面可见性变化、创建徽章、
     * 发送 arrival 上报（首次）或显示恢复提示（续接）
     *
     * @param {boolean} isResume - true 表示恢复之前的进度
     */
    DurationTracker.prototype.doStart = function(isResume) {
        var self = this;

        window.addEventListener("pagehide", this.onPageHide);
        document.addEventListener("visibilitychange", this.onVisibility);

        this.timer = setInterval(function() { self.tick(); }, TICK_MS);

        if (isResume) {
            // 恢复场景：结算最后一次暂停时段
            if (this.pauseStartedAt > 0) {
                this.pausedAccumulated += Date.now() - this.pauseStartedAt;
                this.pauseStartedAt = 0;
            }
            this.isVisible = true;
        } else {
            // 首次启动：发送到达上报
            this.reporter.arrival();
        }

        this.badge = createBadge();
        this.updateBadge();

        // 显示提示
        if (isResume) {
            var remaining = Math.max(0, this.threshold - this.getElapsedMs() / 1000);
            showToast(t("dur_restored", remaining), { duration: 3000 });
        } else {
            showToast(
                t("dur_start", taskLabel(this.params.type), this.threshold),
                { duration: 3500 }
            );
        }
    };

    /**
     * 获取当前有效停留时间（毫秒）
     *
     * 公式：
     *   elapsed = 现在时间 - 开始时间 - 累计暂停时长 - 当前暂停时长
     *
     * 其中"当前暂停时长"仅在 isVisible=false 时计算
     *
     * @returns {number} 有效停留毫秒数
     */
    DurationTracker.prototype.getElapsedMs = function() {
        var elapsed = Date.now() - this.startedAt - this.pausedAccumulated;
        if (!this.isVisible && this.pauseStartedAt > 0) {
            elapsed -= Date.now() - this.pauseStartedAt;
        }
        return Math.max(0, elapsed);
    };

    /**
     * 定时器 tick（每 500ms 执行一次）
     *
     * 检查项：
     *   1. 更新徽章显示
     *   2. 持久化当前进度
     *   3. 时间达标 → 验证滚动（如有要求） → 完成任务
     */
    DurationTracker.prototype.tick = function() {
        if (this.completed) { return; }

        this.updateBadge();
        this.persistDuration();

        // 时间未到，继续等待
        if (this.getElapsedMs() / 1000 < this.threshold) { return; }

        // 滚动验证（文章/小说类任务需要）
        if (!this.validateScroll()) { return; }

        // 任务完成
        clearDurationState(this.params.t_id);
        if (this.badge) { this.badge.complete(); }
        showToast(t("task_done"), { duration: 2500, type: "success" });

        this.onComplete({
            durationMs:   this.getElapsedMs(),
            thresholdSec: this.threshold,
            scrollRate:   this.getScrollRate()
        });
    };

    // ================================================================
    // UI 更新
    // ================================================================

    /** 更新徽章倒计时 */
    DurationTracker.prototype.updateBadge = function() {
        if (!this.badge) { return; }
        var remaining = Math.max(0, this.threshold - this.getElapsedMs() / 1000);
        this.badge.update(remaining, this.threshold, !this.isVisible);
    };

    // ================================================================
    // 持久化
    // ================================================================

    /** 保存当前停留状态到 localStorage */
    DurationTracker.prototype.persistDuration = function() {
        saveDurationState(this.params.t_id, {
            startedAt:         this.startedAt,
            pausedAccumulated: this.pausedAccumulated
        });
    };

    // ================================================================
    // 验证
    // ================================================================

    /**
     * 判断当前页面是否为"目标页面"
     *
     * 通过检查 DOM 中是否存在配置的 STAY_SELECTORS 元素来判断
     * 如果该任务类型没有配置选择器，默认返回 true（认为始终在目标页面）
     *
     * @returns {boolean}
     */
    DurationTracker.prototype.isOnTargetPage = function() {
        var selectors = STAY_SELECTORS[this.params.type];
        if (!selectors || selectors.length === 0) { return true; }

        for (var i = 0; i < selectors.length; i++) {
            try {
                if (document.querySelector(selectors[i])) { return true; }
            } catch (e) {}
        }
        return false;
    };

    /**
     * 验证用户是否已滚动到指定位置
     *
     * 仅当 requireScroll > 0 时才检查
     * 页面高度不足以滚动时（scrollHeight ≤ innerHeight），直接通过
     *
     * @returns {boolean} 是否满足滚动要求
     */
    DurationTracker.prototype.validateScroll = function() {
        if (this.requireScroll <= 0) { return true; }

        var totalScrollable = document.documentElement.scrollHeight - window.innerHeight;
        if (totalScrollable <= 0) { return true; }

        return (window.scrollY / totalScrollable) >= this.requireScroll;
    };

    /**
     * 获取当前滚动完成率
     * @returns {number} 0~1 之间的小数
     */
    DurationTracker.prototype.getScrollRate = function() {
        var totalScrollable = document.documentElement.scrollHeight - window.innerHeight;
        if (totalScrollable <= 0) { return 1; }
        return Math.round((window.scrollY / totalScrollable) * 100) / 100;
    };

    // ---- 导出 ----
    M.DurationTracker = DurationTracker;

})(window.__TaskHostSDK__ = window.__TaskHostSDK__ || {});
