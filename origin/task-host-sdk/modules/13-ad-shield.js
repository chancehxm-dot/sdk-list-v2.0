/**
 * 13-广告屏蔽模拟器
 *
 * 用于模拟广告屏蔽场景：以指定概率随机拦截页面上的点击事件。
 * 主要用于测试任务追踪器在"点击被拦截"情况下的行为。
 *
 * 参数说明：
 *   cb（click block）= 0~100 的整数，表示拦截概率百分比
 *   例如 cb=30 表示 30% 的点击会被拦截。
 *
 * 拦截方式：
 *   在捕获阶段（addEventListener 第三个参数为 true）调用：
 *   preventDefault() + stopPropagation() + stopImmediatePropagation()
 *   彻底阻止事件传递到目标元素。
 */
;(function(M) {
    "use strict";

    /**
     * 构造函数
     *
     * @param {number} cb - 拦截概率（0~100），≤0 表示不拦截
     */
    function AdShield(cb) {
        /** 文档级点击处理器引用 */
        this.handler = null;

        /** 拦截概率 */
        this.cb = cb;
    }

    /**
     * 启动拦截
     *
     * 在 document 上注册捕获阶段的 click 事件监听
     * 每次点击时按概率判断是否需要拦截
     */
    AdShield.prototype.start = function() {
        if (this.cb <= 0) { return; }

        var self = this;
        this.handler = function(evt) {
            if (Math.floor(100 * Math.random()) < self.cb) {
                evt.preventDefault();
                evt.stopPropagation();
                evt.stopImmediatePropagation();
            }
        };

        document.addEventListener("click", this.handler, true);
    };

    /**
     * 停止拦截并移除事件监听
     */
    AdShield.prototype.destroy = function() {
        if (this.handler) {
            document.removeEventListener("click", this.handler, true);
            this.handler = null;
        }
    };

    // ---- 导出 ----
    M.AdShield = AdShield;

})(window.__TaskHostSDK__ = window.__TaskHostSDK__ || {});
