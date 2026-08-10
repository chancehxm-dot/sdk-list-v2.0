/**
 * 02-HTTP 请求层
 *
 * 封装所有网络请求，支持 fetch 优先 + XHR 降级策略。
 * 对外提供三个层级的请求能力：
 *
 *   httpRequest(url, options)  → 标准请求（fetch → XHR 降级）
 *   xhrRequest(url, options)   → 纯 XHR 请求
 *   fireBeacon(url, data)       → 保活信标（三阶降级：fetch keepalive → sendBeacon → 同步 XHR）
 *
 * 降级策略说明：
 *   - 优先使用 fetch（现代浏览器原生支持）
 *   - fetch 失败时自动降级为 XHR
 *   - fireBeacon 用于页面即将卸载时的 final report，采用多重保活手段
 */
;(function(M) {
    "use strict";

    /** 默认请求超时时间（毫秒） */
    var DEFAULT_TIMEOUT = 10000;

    /**
     * 标准 HTTP 请求
     *
     * 请求流程：
     *   1. 如果有 params 参数，拼接到 URL query string
     *   2. 如果有 body 参数，自动设置 Content-Type: application/json
     *   3. 尝试 fetch（支持 keepalive），失败后降级为 XHR
     *
     * @param   {string} url     - 请求地址
     * @param   {Object} options - 请求配置
     * @param   {string} [options.method="GET"]     - HTTP 方法
     * @param   {Object} [options.headers={}]       - 请求头
     * @param   {Object} [options.body]             - 请求体（会自动 JSON.stringify）
     * @param   {Object} [options.params]           - URL 查询参数
     * @param   {number} [options.timeout=10000]    - 超时时间
     * @param   {boolean} [options.keepalive=false] - 是否启用 keepalive
     * @returns {Promise<Object>} 解析后的 JSON 响应
     */
    function httpRequest(url, options) {
        options = options || {};

        var method    = options.method    || "GET";
        var headers   = options.headers   || {};
        var body      = options.body;
        var params    = options.params;
        var timeout   = options.timeout   || DEFAULT_TIMEOUT;
        var keepalive = !!options.keepalive;

        // ---- 拼接 URL 查询参数 ----
        if (params) {
            var qs = "";
            var k;
            for (k in params) {
                if (Object.prototype.hasOwnProperty.call(params, k)) {
                    if (qs) { qs += "&"; }
                    qs += encodeURIComponent(k) + "=" + encodeURIComponent(params[k]);
                }
            }
            if (qs) {
                url = url + (url.indexOf("?") >= 0 ? "&" : "?") + qs;
            }
        }

        // ---- 组装请求头 ----
        var mergedHeaders = {};
        var hk;
        for (hk in headers) {
            if (Object.prototype.hasOwnProperty.call(headers, hk)) {
                mergedHeaders[hk] = headers[hk];
            }
        }
        if (body != null) {
            mergedHeaders["Content-Type"] = "application/json";
        }
        mergedHeaders["X-Requested-With"] = "XMLHttpRequest";

        var jsonBody = body != null ? JSON.stringify(body) : undefined;

        // ---- 优先 fetch，失败降级 XHR ----
        if (typeof fetch === "function") {
            return fetchWithTimeout(url, {
                method:    method,
                headers:   mergedHeaders,
                body:      jsonBody,
                keepalive: keepalive
            }, timeout).then(function(resp) {
                if (!resp.ok) {
                    throw new Error("HTTP " + resp.status);
                }
                return resp.json();
            }).catch(function() {
                // fetch 失败，降级为 XHR
                return xhrRequest(url, {
                    method:  method,
                    headers: mergedHeaders,
                    body:    jsonBody,
                    timeout: timeout
                });
            });
        }

        // 不支持 fetch 的环境直接用 XHR
        return xhrRequest(url, {
            method:  method,
            headers: mergedHeaders,
            body:    jsonBody,
            timeout: timeout
        });
    }

    /**
     * 带超时的 fetch 封装
     *
     * 使用 Promise.race 实现超时控制：
     *   - fetch 和定时器竞争，谁先完成就返回谁的结果
     *
     * @param   {string}  url     - 请求地址
     * @param   {Object}  options - fetch 配置
     * @param   {number}  timeout - 超时毫秒数
     * @returns {Promise<Response>}
     */
    function fetchWithTimeout(url, options, timeout) {
        return Promise.race([
            fetch(url, options),
            new Promise(function(_, reject) {
                setTimeout(function() {
                    reject(new Error("Timeout"));
                }, timeout);
            })
        ]);
    }

    /**
     * XHR 请求（不支持 fetch 环境下的降级方案）
     *
     * @param   {string} url     - 请求地址
     * @param   {Object} options - 请求配置（同 httpRequest）
     * @returns {Promise<Object|string>} 响应内容
     */
    function xhrRequest(url, options) {
        return new Promise(function(resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open(options.method, url, true);

            // 设置请求头
            var headers = options.headers || {};
            var key;
            for (key in headers) {
                if (Object.prototype.hasOwnProperty.call(headers, key)) {
                    xhr.setRequestHeader(key, headers[key]);
                }
            }

            xhr.timeout   = options.timeout || DEFAULT_TIMEOUT;
            xhr.ontimeout = function() { reject(new Error("XHR timeout")); };
            xhr.onerror   = function() { reject(new Error("XHR network error")); };
            xhr.onload    = function() {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        resolve(JSON.parse(xhr.responseText));
                    } catch (e) {
                        resolve(xhr.responseText);
                    }
                } else {
                    reject(new Error("XHR " + xhr.status));
                }
            };

            xhr.send(options.body || null);
        });
    }

    /**
     * 三级保活信标 — 用于 final report（act=f），确保上报一定发出
     *
     * 降级链路：
     *   1. fetch + keepalive: true（最佳方案，异步，不阻塞页面）
     *   2. navigator.sendBeacon （专为页面卸载设计，无需响应）
     *   3. 同步 XHR（最后的保底手段，会阻塞页面但保证送达）
     *
     * @param   {string}  url  - 上报地址
     * @param   {Object}  data - 上报数据
     * @returns {boolean} 是否成功发出
     */
    function fireBeacon(url, data) {
        var body = JSON.stringify(data);

        // 第一级：fetch keepalive
        if (typeof fetch === "function") {
            try {
                fetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type":     "application/json",
                        "X-Requested-With": "XMLHttpRequest"
                    },
                    body:      body,
                    keepalive: true
                }).catch(function() {});
                return true;
            } catch (e) {}
        }

        // 第二级：sendBeacon
        if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
            try {
                var blob = new Blob([body], { type: "text/plain" });
                if (navigator.sendBeacon(url, blob)) {
                    return true;
                }
            } catch (e) {}
        }

        // 第三级：同步 XHR
        try {
            var xhr = new XMLHttpRequest();
            xhr.open("POST", url, false); // 第三个参数 false = 同步
            xhr.setRequestHeader("Content-Type", "application/json");
            xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
            xhr.send(body);
            return xhr.status >= 200 && xhr.status < 300;
        } catch (e) {
            return false;
        }
    }

    // ---- 导出 ----
    M.httpRequest  = httpRequest;
    M.xhrRequest   = xhrRequest;
    M.fireBeacon   = fireBeacon;

})(window.__TaskHostSDK__ = window.__TaskHostSDK__ || {});
