/**
 * 10-追踪器基类
 *
 * 所有任务追踪器的公共祖先，提供：
 *   - 任务参数和适配器的持有
 *   - Reporter 实例的创建
 *   - 阈值（threshold）和 cb（ad-shield 概率）的解析
 *   - 完成回调 onComplete()：清理持久化数据 + 发送 final report + 销毁追踪器
 *
 * 子类：
 *   ClickTracker    — 点击型任务
 *   DurationTracker — 停留型任务
 */
;(function(M) {
    "use strict";

    var Reporter = M.Reporter;

    /**
     * 构造函数
     *
     * 参数解读（从 URL query string 传入）：
     *   target  — 任务目标数量：
     *             点击型：需要点击的次数
     *             停留型：需要停留的秒数
     *   cb      — click block 概率（0~100），用于广告屏蔽模拟
     *
     * @param {Object} params   - 任务参数
     * @param {Object} adapter  - 适配器实例
     * @param {string} [testSign] - 测试签名
     */
    function BaseTracker(params, adapter, testSign) {
        /** 任务是否已完成 */
        this.completed = false;

        /** 任务参数 */
        this.params    = params;

        /** 适配器实例 */
        this.adapter   = adapter;

        /** 上报器 */
        this.reporter  = new Reporter(adapter, params, testSign);

        /** 目标值（点击次数或停留秒数） */
        this.threshold = parseInt(params.target, 10) || 0;

        /** 广告屏蔽命中概率（0~100） */
        this.cb        = parseInt(params.cb, 10) || 0;
    }

    /**
     * 任务完成时的统一回调
     *
     * 执行流程：
     *   1. 防重入检查（completed 标记）
     *   2. 发送 final report（act=f）
     *   3. 清除本地存储的任务参数
     *   4. 调用子类的 destroy() 方法清理资源
     *
     * @param   {Object} data - 完成数据（clickCount / durationMs 等，由子类传入）
     * @returns {Promise<void>}
     */
    BaseTracker.prototype.onComplete = function(data) {
        var self = this;

        if (this.completed) {
            return Promise.resolve();
        }

        this.completed = true;

        return this.reporter.complete().then(function() {
            M.clearTaskParams();
            self.destroy();
        });
    };

    /**
     * 启动追踪器（由子类实现）
     */
    BaseTracker.prototype.start = function() {};

    /**
     * 销毁追踪器、释放资源（由子类实现）
     */
    BaseTracker.prototype.destroy = function() {};

    // ---- 导出 ----
    M.BaseTracker = BaseTracker;

})(window.__TaskHostSDK__ = window.__TaskHostSDK__ || {});
