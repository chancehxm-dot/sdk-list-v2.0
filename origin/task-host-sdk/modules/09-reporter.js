/**
 * 09-上报器
 *
 * 负责生成签名并发送四类任务事件：
 *   s = show（展示）      — 页面首次加载时上报
 *   c = click start（点击开始）— 用户开始点击任务
 *   a = arrival（到达）    — 用户到达目标页面
 *   f = finish（完成）     — 用户完成任务
 *
 * 签名算法：
 *   sign = MD5(c + t_id + site + act + ts)
 *
 * 其中 c 是 URL 参数中的渠道 ID，site 是当前页面域名。
 * 测试模式下可以用 testSign 参数直接注入签名值，跳过 MD5 计算。
 */
;(function(M) {
    "use strict";

    var md5        = M.md5;
    var isLocalDev = M.isLocalDev;

    /**
     * 构造函数
     *
     * @param {Object} adapter  - 适配器实例（MockAdapter 或 RealAdapter）
     * @param {Object} params   - 任务参数 { c, t_id, site, ... }
     * @param {string} [testSign] - 测试签名（不为 null 时直接使用此值作为签名）
     */
    function Reporter(adapter, params, testSign) {
        this.adapter  = adapter;
        this.params   = params;

        // site 的确定顺序：
        //   1. 如果 params.site 有值，直接使用（外部指定）
        //   2. 本地开发模式使用测试域名 "dragonkint.com"
        //   3. 否则使用当前浏览器域名
        this.site = params.site
            ? params.site
            : (isLocalDev() ? M.TEST_SITE : window.location.hostname);

        this.testSign = testSign != null ? testSign : null;
    }

    /**
     * 计算签名
     *
     * 签名原文格式：渠道ID + 任务ID + 站点 + 行为码 + 时间戳
     * 例如：ch001task123dragonkint.coma1689000000
     *
     * @param   {string} act - 行为码（s/c/a/f 之一）
     * @param   {string} ts  - Unix 时间戳（秒）
     * @returns {string} MD5 十六进制签名
     */
    Reporter.prototype.computeSign = function(act, ts) {
        var raw = this.params.c + this.params.t_id + this.site + act + ts;
        return md5(raw);
    };

    /**
     * 发送上报（内部方法）
     *
     * @param   {string} act - 行为码
     * @returns {Promise<void>}
     */
    Reporter.prototype.send = function(act) {
        var ts   = String(Math.floor(Date.now() / 1000));
        var sign = this.testSign != null
            ? this.testSign
            : this.computeSign(act, ts);

        return this.adapter.report({
            c_id: this.params.c,
            t_id: this.params.t_id,
            site: this.site,
            act:  act,
            ts:   ts,
            sign: sign
        }).catch(function() {
            // 上报失败静默忽略（由 adapter 层处理重试/降级）
        });
    };

    /**
     * 上报"展示"事件
     */
    Reporter.prototype.show = function() {
        return this.send("s");
    };

    /**
     * 上报"点击开始"事件
     */
    Reporter.prototype.clickStart = function() {
        return this.send("c");
    };

    /**
     * 上报"到达"事件
     */
    Reporter.prototype.arrival = function() {
        return this.send("a");
    };

    /**
     * 上报"完成"事件（act=f，会触发 adapter 的多级保活）
     */
    Reporter.prototype.complete = function() {
        return this.send("f");
    };

    // ---- 导出 ----
    M.Reporter = Reporter;

})(window.__TaskHostSDK__ = window.__TaskHostSDK__ || {});
