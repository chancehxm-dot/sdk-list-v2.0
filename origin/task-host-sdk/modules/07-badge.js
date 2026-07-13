/**
 * 07-圆形倒计时徽章
 *
 * 页面右下角的悬浮倒计时组件，用于停留型任务。
 * 展示剩余秒数和一个 SVG 环形进度条。
 *
 * 状态说明：
 *   - 正常计时：绿色环形进度 + 剩余秒数
 *   - 低于 30%：  橙色进度条（提醒用户时间紧迫）
 *   - 暂停状态：  灰色进度条 + ⏸ 图标
 *   - 完成状态：  缩放动画 + ✅ 图标，2 秒后自动消失
 *
 * 对外接口（返回对象的方法）：
 *   badge.update(elapsed, total, isPaused) — 更新进度
 *   badge.complete()                       — 标记完成
 *   badge.destroy()                        — 移除 DOM
 */
;(function(M) {
    "use strict";

    /** 环形进度条的圆周长（半径 25px × 2π） */
    var RING_CIRCUMFERENCE = 2 * Math.PI * 25;

    /** CSS 是否已注入 */
    var cssInjected = false;

    /**
     * 注入徽章样式（仅首次调用）
     */
    function injectCSS() {
        if (cssInjected) { return; }
        cssInjected = true;

        var css = [
            '.__tsk_bdg__{',
                'position:fixed;right:20px;bottom:24px;',
                'z-index:2147483646;',
                'width:54px;height:54px;border-radius:50%;',
                'background:#fff;',
                'box-shadow:0 2px 12px rgba(0,0,0,0.15);',
                'display:flex;align-items:center;justify-content:center;',
                'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;',
                'pointer-events:none;user-select:none;',
                'animation:__tsk_bdg_in__ .3s ease-out;',
            '}',
            '@keyframes __tsk_bdg_in__{',
                'from{opacity:0;transform:scale(.6)}',
                'to{opacity:1;transform:scale(1)}',
            '}',
            '.__tsk_bdg_ring__{',
                'position:absolute;top:0;left:0;',
                'transform:rotate(-90deg);', // 从顶部 12 点方向开始
            '}',
            '.__tsk_bdg_ring_bg__{',
                'stroke:#e8e8e8;fill:none;stroke-width:4;',
            '}',
            '.__tsk_bdg_ring_fg__{',
                'fill:none;stroke-width:4;stroke-linecap:round;',
                'transition:stroke-dashoffset .45s ease,stroke .3s;',
            '}',
            '.__tsk_bdg_num__{',
                'font-size:15px;font-weight:600;color:#333;z-index:1;',
            '}',
            '.__tsk_bdg_paused__ .__tsk_bdg_num__{',
                'font-size:12px;',
            '}',
            '.__tsk_bdg_complete__{',
                'animation:__tsk_bdg_pop__ .35s ease;',
            '}',
            '@keyframes __tsk_bdg_pop__{',
                '0%{transform:scale(1)}',
                '50%{transform:scale(1.18)}',
                '100%{transform:scale(1)}',
            '}'
        ].join("");

        var style = document.createElement("style");
        style.textContent = css;
        document.head.appendChild(style);
    }

    /**
     * 创建并挂载一个圆形倒计时徽章
     *
     * @returns {Object} 徽章控制对象
     */
    function createBadge() {
        injectCSS();

        // ---- 构建 DOM 结构 ----

        // 外层容器
        var container = document.createElement("div");
        container.className = "__tsk_bdg__";

        // SVG 环形进度条
        var svgNS = "http://www.w3.org/2000/svg";
        var svg   = document.createElementNS(svgNS, "svg");
        svg.setAttribute("class", "__tsk_bdg_ring__");
        svg.setAttribute("width",  "54");
        svg.setAttribute("height", "54");

        // 背景圆环（灰色底）
        var bgCircle = document.createElementNS(svgNS, "circle");
        bgCircle.setAttribute("class", "__tsk_bdg_ring_bg__");
        bgCircle.setAttribute("cx", "27");
        bgCircle.setAttribute("cy", "27");
        bgCircle.setAttribute("r",  "25");
        svg.appendChild(bgCircle);

        // 前景圆环（彩色进度）
        var fgCircle = document.createElementNS(svgNS, "circle");
        fgCircle.setAttribute("class", "__tsk_bdg_ring_fg__");
        fgCircle.setAttribute("cx", "27");
        fgCircle.setAttribute("cy", "27");
        fgCircle.setAttribute("r",  "25");
        fgCircle.setAttribute("stroke-dasharray",  String(RING_CIRCUMFERENCE));
        fgCircle.setAttribute("stroke-dashoffset", "0");
        fgCircle.setAttribute("stroke", "#4caf50");
        svg.appendChild(fgCircle);

        container.appendChild(svg);

        // 数字文本
        var numEl = document.createElement("span");
        numEl.className = "__tsk_bdg_num__";
        numEl.textContent = "";
        container.appendChild(numEl);

        document.body.appendChild(container);

        // ---- 内部状态 ----
        var completed = false;

        // ---- 返回控制对象 ----

        return {
            /**
             * 更新徽章显示
             *
             * @param {number}  elapsed  - 已过时间（秒）
             * @param {number}  total    - 总时长（秒）
             * @param {boolean} isPaused - 是否处于暂停状态
             */
            update: function(elapsed, total, isPaused) {
                if (completed) { return; }

                // 计算进度（0~1）
                var progress = total > 0
                    ? Math.max(0, Math.min(1, elapsed / total))
                    : 1;

                // 更新圆环偏移量
                fgCircle.setAttribute("stroke-dashoffset",
                    String(RING_CIRCUMFERENCE * (1 - progress)));

                if (isPaused) {
                    fgCircle.setAttribute("stroke", "#9e9e9e");
                    numEl.textContent = "⏸";
                    container.classList.add("__tsk_bdg_paused__");
                } else {
                    // 低于 30% 时显示橙色作为提醒
                    fgCircle.setAttribute("stroke",
                        progress < 0.3 ? "#ff9800" : "#4caf50");
                    numEl.textContent = String(Math.max(0, Math.ceil(elapsed)));
                    container.classList.remove("__tsk_bdg_paused__");
                }
            },

            /**
             * 标记任务完成：绿色满环 + ✅ + 弹跳动画
             */
            complete: function() {
                if (completed) { return; }
                completed = true;

                fgCircle.setAttribute("stroke", "#4caf50");
                fgCircle.setAttribute("stroke-dashoffset", "0");
                numEl.textContent = "✅";
                container.classList.add("__tsk_bdg_complete__");
                container.classList.remove("__tsk_bdg_paused__");

                var self = this;
                setTimeout(function() { self.destroy(); }, 2000);
            },

            /**
             * 淡出并移除 DOM
             */
            destroy: function() {
                container.style.opacity = "0";
                container.style.transition = "opacity .25s";
                var el = container;
                setTimeout(function() {
                    if (el.parentNode) {
                        el.parentNode.removeChild(el);
                    }
                }, 260);
            }
        };
    }

    // ---- 导出 ----
    M.createBadge = createBadge;

})(window.__TaskHostSDK__ = window.__TaskHostSDK__ || {});
