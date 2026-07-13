/**
 * 08-适配器
 *
 * 适配器负责将 Reporter 产生的上报数据发送到服务端。
 * 设计为可替换的策略模式，方便测试和切换后端。
 *
 * 两种实现：
 *   MockAdapter  — 模拟适配器，不做任何网络请求（用于开发/测试）
 *   RealAdapter  — 真实适配器，通过 HTTP POST 发送上报数据
 *
 * RealAdapter 对不同类型的上报采用不同的发送策略：
 *   - 普通事件（act ≠ "f"）：带 keepalive 的异步请求，失败不重试
 *   - 完成事件（act = "f"）：三级保活降级（请求 → beacon → 同步 XHR）
 */
;(function(M) {
    "use strict";

    var httpRequest = M.httpRequest;
    var fireBeacon  = M.fireBeacon;

    // ================================================================
    // MockAdapter — 模拟适配器
    // ================================================================

    /**
     * 构造函数
     * 无需参数，所有 report 调用只返回一个 40ms 后 resolve 的 Promise
     */
    function MockAdapter() {}

    /**
     * 模拟上报：延迟 40ms 后返回成功
     * @param   {Object}  data - 上报数据（不使用，仅保持接口一致）
     * @returns {Promise<void>}
     */
    MockAdapter.prototype.report = function(data) {
        return new Promise(function(resolve) {
            setTimeout(resolve, 40);
        });
    };

    // ================================================================
    // RealAdapter — 真实 HTTP 适配器
    // ================================================================

    /**
     * 构造函数
     *
     * @param {string} baseURL - API 服务器基础地址
     * @param {string} [ver="v2"] - API 版本号
     */
    function RealAdapter(baseURL, ver) {
        this.baseURL = baseURL;
        this.ver     = ver || "v2";
    }

    /**
     * 发送上报数据
     *
     * 请求地址：{baseURL}/api/{ver}/report
     * 请求方式：POST
     * 请求体格式：JSON
     *
     * 上报字段说明：
     *   c_id  — 渠道 ID
     *   t_id  — 任务 ID
     *   site  — 站点域名
     *   act   — 行为码（s=展示, c=点击开始, a=到达, f=完成）
     *   ts    — 时间戳（秒）
     *   sign  — MD5 签名
     *
     * @param   {Object}  data - 上报数据
     * @param   {string}  data.c_id
     * @param   {string}  data.t_id
     * @param   {string}  data.site
     * @param   {string}  data.act
     * @param   {string}  data.ts
     * @param   {string}  data.sign
     * @returns {Promise<void>}
     */
    RealAdapter.prototype.report = function(data) {
        var url  = this.baseURL + "/api/" + this.ver + "/report";
        var body = {
            c_id: data.c_id,
            t_id: data.t_id,
            site: data.site,
            act:  data.act,
            ts:   data.ts,
            sign: data.sign
        };

        // ---- 非最终事件：发出去就行，不等待结果 ----
        if (data.act !== "f") {
            return httpRequest(url, {
                method:    "POST",
                body:      body,
                keepalive: true
            }).catch(function() {
                // 普通事件上报失败静默忽略
            });
        }

        // ---- 最终事件（act = "f"）：多级保活 ----
        return httpRequest(url, {
            method:  "POST",
            body:    body,
            timeout: 3000
        }).catch(function() {
            // 第一级降级：beacon 保活
            try {
                fireBeacon(url, body);
            } catch (e2) {
                // 第二级降级：fetch keepalive 兜底
                if (typeof fetch === "function") {
                    fetch(url, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(body),
                        keepalive: true
                    }).catch(function() {});
                }
            }
        });
    };

    // ---- 导出 ----
    M.MockAdapter = MockAdapter;
    M.RealAdapter = RealAdapter;

})(window.__TaskHostSDK__ = window.__TaskHostSDK__ || {});
