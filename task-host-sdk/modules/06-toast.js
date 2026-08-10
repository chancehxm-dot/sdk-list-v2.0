/**
 * 06-Toast 提示组件
 *
 * 在页面顶部居中显示通知消息，自动消失。
 * 支持三种视觉主题：info（普通）、success（成功）、warn（警告）
 *
 * 设计要点：
 *   - 全局单例：同一时间只显示一条 toast
 *   - CSS 只注入一次（__tsk_toast__ 动画）
 *   - 返回 dismiss 函数，调用方可提前关闭
 *   - backdrop-filter 毛玻璃效果（不支持时降级为纯色背景）
 */
;(function(M) {
    "use strict";

    // ================================================================
    // 内部状态
    // ================================================================

    /** 当前正在显示的 toast DOM 元素 */
    var toastEl = null;

    /** 自动消失的定时器 ID */
    var toastTimer = null;

    /** CSS 是否已注入（全局只需注入一次） */
    var cssInjected = false;

    // ================================================================
    // 主题配色
    // ================================================================

    /** 三种主题的背景色和边框色 */
    var THEMES = {
        info: {
            bg:     "rgba(0,0,0,0.82)",
            border: "rgba(255,255,255,0.12)"
        },
        success: {
            bg:     "rgba(46,125,50,0.92)",
            border: "rgba(255,255,255,0.18)"
        },
        warn: {
            bg:     "rgba(230,81,0,0.92)",
            border: "rgba(255,255,255,0.18)"
        }
    };

    // ================================================================
    // CSS 注入
    // ================================================================

    /**
     * 注入 toast 样式（仅首次调用时执行）
     *
     * 样式要点：
     *   - z-index: 2147483647（最高层级，确保不被遮挡）
     *   - 入场动画：__tsk_in__（淡入 + 上移）
     *   - 退场动画：__tsk_toast_out__（淡出 + 上移）
     */
    function injectCSS() {
        if (cssInjected) { return; }
        cssInjected = true;

        var css = [
            '.__tsk_toast__{',
                'position:fixed;',
                'top:18px;',
                'left:50%;',
                'transform:translateX(-50%);',
                'z-index:2147483647;',
                'padding:10px 22px;',
                'border-radius:10px;',
                'border:1px solid transparent;',
                'color:#fff;',
                'font-size:14px;',
                'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;',
                'line-height:1.4;',
                'text-align:center;',
                'max-width:90vw;',
                'backdrop-filter:blur(8px);',
                '-webkit-backdrop-filter:blur(8px);',
                'box-shadow:0 4px 16px rgba(0,0,0,0.18);',
                'pointer-events:auto;',
                'user-select:none;',
                'animation:__tsk_in__ .28s ease-out;',
                'transition:opacity .2s,transform .2s;',
            '}',
            '@keyframes __tsk_in__{',
                'from{opacity:0;transform:translateX(-50%) translateY(-10px);}',
                'to{opacity:1;transform:translateX(-50%) translateY(0);}',
            '}',
            '.__tsk_toast_out__{',
                'opacity:0;transform:translateX(-50%) translateY(-10px);',
            '}'
        ].join("");

        var style = document.createElement("style");
        style.textContent = css;
        document.head.appendChild(style);
    }

    // ================================================================
    // 公开 API
    // ================================================================

    /**
     * 关闭当前 toast（带退场动画）
     */
    function dismissToast() {
        if (toastTimer) {
            clearTimeout(toastTimer);
            toastTimer = null;
        }

        if (!toastEl) { return; }

        toastEl.classList.add("__tsk_toast_out__");

        var el = toastEl;
        toastEl = null;

        // 等退场动画播完（220ms）再移除 DOM
        setTimeout(function() {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
        }, 220);
    }

    /**
     * 显示 toast 消息
     *
     * 用法：
     *   showToast("任务完成！")                               // 默认 info，显示 3 秒
     *   showToast("操作成功", { type: "success" })            // 成功主题
     *   showToast("请检查网络", { type: "warn", duration: 5000 })  // 警告主题，显示 5 秒
     *   var dismiss = showToast("..."); dismiss();            // 手动关闭
     *
     * @param   {string}  msg  - 消息文本
     * @param   {Object}  [opts] - 选项
     * @param   {number}  [opts.duration=3000] - 显示时长（毫秒）
     * @param   {string}  [opts.type="info"]   - 主题：info | success | warn
     * @returns {Function} dismiss 函数，调用可提前关闭
     */
    function showToast(msg, opts) {
        injectCSS();

        var duration = (opts && opts.duration != null) ? opts.duration : 3000;
        var type     = (opts && opts.type) || "info";

        // 关闭当前正在显示的 toast
        dismissToast();

        // 创建新 toast 元素
        var div = document.createElement("div");
        div.className   = "__tsk_toast__";
        div.textContent = msg;

        // 应用主题样式
        var theme = THEMES[type] || THEMES.info;
        div.style.background  = theme.bg;
        div.style.borderColor = theme.border;

        document.body.appendChild(div);
        toastEl = div;

        // 自动消失
        if (duration > 0) {
            toastTimer = setTimeout(dismissToast, duration);
        }

        return dismissToast;
    }

    // ---- 导出 ----
    M.showToast     = showToast;
    M.dismissToast  = dismissToast;

})(window.__TaskHostSDK__ = window.__TaskHostSDK__ || {});
