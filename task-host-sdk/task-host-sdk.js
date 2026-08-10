/*!
 * TaskHostSDK v2.0
 * Build date: 2026-07-10T09:50:29.871Z
 *
 * 任务追踪 SDK，支持点击型和停留型任务的自动上报。
 * ES5 兼容，无框架依赖。
 *
 * 项目仓库: utils-project/sdk-list/v2.0
 */
// ================================================================
// 00-core.js (60 lines)
// ================================================================

/**
 * 00-核心工具
 *
 * 提供对象操作的基础函数，所有其他模块都依赖此模块。
 * - extend: 浅拷贝属性
 * - inherit: 原型链继承（模拟 ES6 extends）
 */
;(function(M) {
    "use strict";

    /**
     * 将 source 的可枚举属性拷贝到 target（浅拷贝）
     *
     * @param   {Object} target - 目标对象
     * @param   {Object} source - 源对象
     * @returns {Object} 合并后的 target
     */
    function extend(target, source) {
        var key;
        for (key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
                target[key] = source[key];
            }
        }
        return target;
    }

    /**
     * 原型链继承
     *
     * 用法：inherit(Child, Parent)
     * 之后 Child.prototype 会指向 Parent.prototype 的新实例，
     * 同时 constructor 指回 Child 自身。
     *
     * @param {Function} Child  - 子类构造函数
     * @param {Function} Parent - 父类构造函数
     */
    function inherit(Child, Parent) {
        Child.prototype = Object.create(Parent.prototype);
        Child.prototype.constructor = Child;
    }

    /**
     * 将 arguments 类数组转为真正的数组
     * 用于处理可变参数函数
     *
     * @param   {Arguments} args - 函数的 arguments 对象
     * @returns {Array} 转换后的数组
     */
    function toArray(args) {
        return Array.prototype.slice.call(args);
    }

    // ---- 导出 ----
    M.extend  = extend;
    M.inherit = inherit;
    M.toArray = toArray;

})(window.__TaskHostSDK__ = window.__TaskHostSDK__ || {});


// ================================================================
// 01-md5.js (211 lines)
// ================================================================

/**
 * 01-MD5 哈希
 *
 * 完整的 MD5 消息摘要算法实现。
 * 用于对上报请求参数做签名，防止数据被篡改。
 *
 * 输入：任意字符串
 * 输出：32 位小写十六进制字符串
 *
 * 使用方式：
 *   var sign = M.md5("hello world");
 *   // sign === "5eb63bbbe01eeed093cb22bb8f5acdc3"
 */
;(function(M) {
    "use strict";

    /** 每轮的左移位数表 */
    var S = [
        7, 12, 17, 22,  7, 12, 17, 22,  7, 12, 17, 22,  7, 12, 17, 22,
        5,  9, 14, 20,  5,  9, 14, 20,  5,  9, 14, 20,  5,  9, 14, 20,
        4, 11, 16, 23,  4, 11, 16, 23,  4, 11, 16, 23,  4, 11, 16, 23,
        6, 10, 15, 21,  6, 10, 15, 21,  6, 10, 15, 21,  6, 10, 15, 21
    ];

    /** 每轮的常量表 K[i] = floor(abs(sin(i+1)) * 2^32) */
    var K = [
        -680876936, -389564586,  606105819, -1044525330,
        -176418897,  1200080426, -1473231341,   -45705983,
        1770035416, -1958414417,      -42063, -1990404162,
        1804603682,  -40341101, -1502002290,  1236535329,
        -165796510, -1069501632,   643717713,  -373897302,
        -701558691,    38016083,  -660478335,   -405537848,
         568446438, -1019803690,  -187363961,  1163531501,
       -1444681467,   -51403784,  1735328473, -1926607734,
           -378558, -2022574463,  1839030562,    -35309556,
       -1530992060,  1272893353,  -155497632, -1094730640,
         681279174,  -358537222,  -722521979,     76029189,
        -640364487,  -421815835,   530742520,   -995338651,
        -198630844,  1126891415, -1416354905,    -57434055,
        1700485571, -1894986606,    -1051523, -2054922799,
        1873313359,   -30611744, -1560198380,   1309151649,
        -145523070, -1120210379,   718787259,   -343485551
    ];

    /** 初始向量 IV */
    var INIT_A = 1732584193;   // 0x67452301
    var INIT_B = -271733879;   // 0xEFCDAB89
    var INIT_C = -1732584194;  // 0x98BADCFE
    var INIT_D = 271733878;    // 0x10325476

    /**
     * 循环左移
     * @param   {number} x - 待移位的 32 位整数
     * @param   {number} n - 左移位数
     * @returns {number} 移位后的无符号 32 位整数
     */
    function rotl(x, n) {
        return (x << n) | (x >>> (32 - n));
    }

    /**
     * 将字符串转换为 UTF-8 字节数组
     *
     * @param   {string} str - 原始字符串
     * @returns {number[]} UTF-8 编码的字节数组
     */
    function toUTF8Bytes(str) {
        var bytes = [];
        var i, ch;

        for (i = 0; i < str.length; i++) {
            ch = str.charCodeAt(i);

            if (ch < 0x80) {
                // 单字节 ASCII：0xxx xxxx
                bytes.push(ch);
            } else if (ch < 0x800) {
                // 双字节：110x xxxx 10xx xxxx
                bytes.push(0xC0 | (ch >> 6));
                bytes.push(0x80 | (ch & 0x3F));
            } else if (ch < 0xD800 || ch >= 0xE000) {
                // 三字节 BMP 字符：1110 xxxx 10xx xxxx 10xx xxxx
                bytes.push(0xE0 | (ch >> 12));
                bytes.push(0x80 | ((ch >> 6) & 0x3F));
                bytes.push(0x80 | (ch & 0x3F));
            } else {
                // 四字节（代理对）：处理 emoji 等补充平面字符
                i++;
                var cp = ((ch & 0x3FF) << 10) | (str.charCodeAt(i) & 0x3FF);
                bytes.push(0xF0 | (cp >> 18));
                bytes.push(0x80 | ((cp >> 12) & 0x3F));
                bytes.push(0x80 | ((cp >> 6) & 0x3F));
                bytes.push(0x80 | (cp & 0x3F));
            }
        }

        return bytes;
    }

    /**
     * 从字节数组中读取一个 32 位小端字
     *
     * @param   {number[]} arr - 字节数组
     * @param   {number}   off - 偏移量
     * @returns {number} 无符号 32 位整数
     */
    function readWord(arr, off) {
        return (arr[off] | (arr[off + 1] << 8) | (arr[off + 2] << 16) | (arr[off + 3] << 24)) >>> 0;
    }

    /**
     * 计算 MD5 哈希
     *
     * @param   {string} input - 待哈希的字符串
     * @returns {string} 32 位小写十六进制 MD5 值
     */
    function md5(input) {
        // ---- 第一步：UTF-8 编码并填充 ----
        var msgBytes = toUTF8Bytes(input);
        var msgLen   = msgBytes.length;
        var padLen   = (((msgLen + 8) >>> 6) + 1) << 6; // 补位后总长度（必须是 64 的倍数）
        var words    = new Array(padLen);

        var i;
        for (i = 0; i < padLen; i++) { words[i] = 0; }
        for (i = 0; i < msgLen; i++) { words[i] = msgBytes[i]; }

        // 补位：先加一个 0x80，后续全是 0x00
        words[msgLen] = 0x80;

        // 附加原始消息长度（64 位小端，只取低 64 位中的低 32 和高 32）
        var bitLen = 8 * msgLen;
        words[padLen - 8] =  bitLen        & 0xFF;
        words[padLen - 7] = (bitLen >>> 8)  & 0xFF;
        words[padLen - 6] = (bitLen >>> 16) & 0xFF;
        words[padLen - 5] = (bitLen >>> 24) & 0xFF;

        // ---- 第二步：初始化缓冲区 ----
        var a = INIT_A;
        var b = INIT_B;
        var c = INIT_C;
        var d = INIT_D;

        // ---- 第三步：主循环（每次处理 64 字节 / 512 位块） ----
        var hexChars = "0123456789abcdef";

        for (var block = 0; block < padLen; block += 64) {
            var aa = a, bb = b, cc = c, dd = d;

            // 将当前块分解为 16 个 32 位字
            var M = new Array(16);
            for (var j = 0; j < 16; j++) {
                M[j] = readWord(words, block + 4 * j);
            }

            // 64 轮变换
            for (var r = 0; r < 64; r++) {
                var f, idx;

                if (r < 16) {
                    // 轮次 1: F(B,C,D) = (B & C) | (~B & D)
                    f   = (bb & cc) | (~bb & dd);
                    idx = r;
                } else if (r < 32) {
                    // 轮次 2: G(B,C,D) = (D & B) | (~D & C)
                    f   = (dd & bb) | (~dd & cc);
                    idx = (5 * r + 1) % 16;
                } else if (r < 48) {
                    // 轮次 3: H(B,C,D) = B ^ C ^ D
                    f   = bb ^ cc ^ dd;
                    idx = (3 * r + 5) % 16;
                } else {
                    // 轮次 4: I(B,C,D) = C ^ (B | ~D)
                    f   = cc ^ (bb | ~dd);
                    idx = (7 * r) % 16;
                }

                var temp = dd;
                dd = cc;
                cc = bb;
                bb = (bb + rotl(aa + f + K[r] + M[idx], S[r])) >>> 0;
                aa = temp;
            }

            // 累加到缓冲区
            a = (a + aa) >>> 0;
            b = (b + bb) >>> 0;
            c = (c + cc) >>> 0;
            d = (d + dd) >>> 0;
        }

        // ---- 第四步：输出 32 位十六进制字符串 ----
        var out = "";
        var parts = [a, b, c, d];

        for (var p = 0; p < 4; p++) {
            var val = parts[p];
            for (var t = 0; t < 4; t++) {
                out += hexChars[(val >>> (8 * t + 4)) & 0xF];
                out += hexChars[(val >>> (8 * t))      & 0xF];
            }
        }

        return out;
    }

    // ---- 导出 ----
    M.md5 = md5;

})(window.__TaskHostSDK__ = window.__TaskHostSDK__ || {});


// ================================================================
// 02-http.js (234 lines)
// ================================================================

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


// ================================================================
// 03-config.js (174 lines)
// ================================================================

/**
 * 03-配置常量
 *
 * 定义所有任务类型、选择器映射、API 地址和存储键名。
 * 这些是 SDK 运行的核心静态数据，不依赖其他模块。
 *
 * 任务类型说明：
 *   click  = 点击型任务（用户需要点击页面上的目标元素）
 *   stay   = 停留型任务（用户需要在目标页面停留足够时间）
 */
;(function(M) {
    "use strict";

    // ================================================================
    // 任务类型 → 行为类别 映射
    // ================================================================

    /** 每种任务类型对应的追踪模式 */
    M.TASK_ACTIONS = {
        game_click:          "click",
        video_click:         "click",
        news_click:          "click",
        novel_click:         "click",
        questionnaire_click: "click",
        game_stay:           "stay",
        video_stay:          "stay",
        news_stay:           "stay",
        novel_stay:          "stay"
    };

    // ================================================================
    // 点击型任务 — 目标元素 CSS 选择器
    // ================================================================

    /**
     * 每个点击型任务对应的 DOM 选择器列表。
     * SDK 会按顺序尝试匹配，找到第一个可见元素即为"命中"。
     */
    M.CLICK_SELECTORS = {
        game_click: [
            "#start-game-btn",
            ".play-button",
            '[data-action="play"]',
            ".game-start",
            ".btn-play"
        ],
        video_click: [
            "video",
            ".video-player",
            "[data-player]"
        ],
        news_click: [
            "article",
            ".article-content",
            ".post-body",
            ".entry-content"
        ],
        novel_click: [
            ".reader",
            ".chapter-content",
            ".novel-content",
            "#reader"
        ],
        questionnaire_click: [
            "form",
            ".questionnaire",
            ".survey-form",
            "#survey"
        ]
    };

    // ================================================================
    // 停留型任务 — 目标页面 CSS 选择器
    // ================================================================

    /**
     * 每个停留型任务用于判断"是否在目标页面"的 DOM 选择器。
     * 只要页面中存在至少一个匹配元素，即认为"在目标页面"。
     */
    M.STAY_SELECTORS = {
        game_stay: [
            "#game-container",
            ".game-frame",
            "[data-game]",
            ".game-page",
            'iframe[src*="game"]'
        ],
        video_stay: [
            "video",
            ".video-player",
            "[data-player]",
            ".video-container"
        ],
        news_stay: [
            "article",
            ".article-content",
            ".post-body",
            ".entry-content",
            ".news-detail"
        ],
        novel_stay: [
            ".reader",
            ".chapter-content",
            ".novel-content",
            "#reader",
            ".book-content"
        ]
    };

    // ================================================================
    // API 地址检测
    // ================================================================

    /** 本地开发域名正则 */
    var LOCAL_DEV_RE  = /^(localhost|127\.0\.0\.1)$/;

    /** 内网地址正则（本地开发、局域网、VPN 等） */
    var LOCAL_NET_RE  = /^(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/;

    /** 生产环境 API 地址 */
    M.PROD_API_BASE   = "https://api.zombifieds.com";

    /** 内网开发 API 地址 */
    M.DEV_API_BASE    = "http://192.168.1.153:7020";

    /** 本地开发测试用的模拟站点域名 */
    M.TEST_SITE       = "dragonkint.com";

    /**
     * 判断当前是否在本地开发环境
     * @returns {boolean}
     */
    function isLocalDev() {
        return LOCAL_DEV_RE.test(window.location.hostname);
    }

    /**
     * 判断当前是否在内网环境
     * @returns {boolean}
     */
    function isLocalNetwork() {
        return LOCAL_NET_RE.test(window.location.hostname);
    }

    /**
     * 自动检测 API 基础地址
     * 内网环境返回开发地址，否则返回生产地址
     *
     * @returns {string} API 基础 URL
     */
    function detectAPIBase() {
        return isLocalNetwork() ? M.DEV_API_BASE : M.PROD_API_BASE;
    }

    // ================================================================
    // localStorage 键名
    // ================================================================

    /** 任务参数存储键 */
    M.KEY_PARAMS   = "__task_host_params__";

    /** 点击计数键前缀，完整键名为 __task_click_{t_id} */
    M.KEY_CLICK_PREFIX  = "__task_click_";

    /** 停留状态键前缀，完整键名为 __task_dur_{t_id} */
    M.KEY_DURATION_PREFIX = "__task_dur_";

    // ---- 导出 ----
    M.isLocalDev     = isLocalDev;
    M.isLocalNetwork = isLocalNetwork;
    M.detectAPIBase  = detectAPIBase;

})(window.__TaskHostSDK__ = window.__TaskHostSDK__ || {});


// ================================================================
// 04-storage.js (172 lines)
// ================================================================

/**
 * 04-本地存储层
 *
 * 对浏览器 localStorage 做一层包装，提供内存降级方案。
 * localStorage 不可用时（如隐私模式、存储满），自动切换为内存存储。
 *
 * 持久化数据分类：
 *   1. 任务参数（__task_host_params__）         — 保存 URL 传入的所有任务参数
 *   2. 点击计数（__task_click_{t_id}）           — 保存用户已完成的点击次数
 *   3. 停留状态（__task_dur_{t_id}）             — 保存停留计时器状态
 *
 * 每类数据都有 save / load / clear 三个操作，用于页面刷新后恢复任务进度。
 */
;(function(M) {
    "use strict";

    var KEY_PARAMS          = M.KEY_PARAMS;
    var KEY_CLICK_PREFIX    = M.KEY_CLICK_PREFIX;
    var KEY_DURATION_PREFIX = M.KEY_DURATION_PREFIX;

    // ================================================================
    // 存储引擎选择
    // ================================================================

    /**
     * 创建存储引擎。
     * 优先使用 localStorage，不可用时降级为内存对象。
     */
    var storage = (function() {
        var memStore = {}; // 内存降级对象

        try {
            // 探针：尝试写入再删除，验证 localStorage 是否可用
            localStorage.setItem("__sdk_test__", "1");
            localStorage.removeItem("__sdk_test__");

            return {
                getItem:    function(k) { return localStorage.getItem(k); },
                setItem:    function(k, v) { localStorage.setItem(k, v); },
                removeItem: function(k) { localStorage.removeItem(k); }
            };
        } catch (e) {
            // localStorage 不可用，使用内存存储
            return {
                getItem:    function(k) { return memStore[k] != null ? memStore[k] : null; },
                setItem:    function(k, v) { memStore[k] = v; },
                removeItem: function(k) { delete memStore[k]; }
            };
        }
    })();

    // ================================================================
    // 任务参数持久化
    // ================================================================

    /**
     * 保存任务参数到本地存储
     * @param {Object} params - { t_id, c, type, target, cb, site, ver, start_selector }
     */
    function saveTaskParams(params) {
        try {
            storage.setItem(KEY_PARAMS, JSON.stringify(params));
        } catch (e) {}
    }

    /**
     * 从本地存储读取任务参数
     * @returns {Object|null} 任务参数，不存在时返回 null
     */
    function loadTaskParams() {
        try {
            var raw = storage.getItem(KEY_PARAMS);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    /**
     * 清除本地存储中的任务参数
     */
    function clearTaskParams() {
        storage.removeItem(KEY_PARAMS);
    }

    // ================================================================
    // 点击计数持久化
    // ================================================================

    /**
     * 保存点击计数
     * @param {string} tId   - 任务 ID
     * @param {number} count - 已点击次数
     */
    function saveClickCount(tId, count) {
        try {
            storage.setItem(KEY_CLICK_PREFIX + tId, String(count));
        } catch (e) {}
    }

    /**
     * 读取点击计数
     * @param   {string} tId - 任务 ID
     * @returns {number} 已点击次数，默认为 0
     */
    function loadClickCount(tId) {
        try {
            var raw = storage.getItem(KEY_CLICK_PREFIX + tId);
            return raw ? parseInt(raw, 10) || 0 : 0;
        } catch (e) {
            return 0;
        }
    }

    /**
     * 清除点击计数
     * @param {string} tId - 任务 ID
     */
    function clearClickCount(tId) {
        storage.removeItem(KEY_CLICK_PREFIX + tId);
    }

    // ================================================================
    // 停留状态持久化
    // ================================================================

    /**
     * 保存停留计时器状态
     * @param {string} tId   - 任务 ID
     * @param {Object} state - { startedAt: number, pausedAccumulated: number }
     */
    function saveDurationState(tId, state) {
        try {
            storage.setItem(KEY_DURATION_PREFIX + tId, JSON.stringify(state));
        } catch (e) {}
    }

    /**
     * 读取停留计时器状态
     * @param   {string} tId - 任务 ID
     * @returns {Object|null} 停留状态对象，不存在时返回 null
     */
    function loadDurationState(tId) {
        try {
            var raw = storage.getItem(KEY_DURATION_PREFIX + tId);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    /**
     * 清除停留计时器状态
     * @param {string} tId - 任务 ID
     */
    function clearDurationState(tId) {
        storage.removeItem(KEY_DURATION_PREFIX + tId);
    }

    // ---- 导出 ----
    M.saveTaskParams     = saveTaskParams;
    M.loadTaskParams     = loadTaskParams;
    M.clearTaskParams    = clearTaskParams;
    M.saveClickCount     = saveClickCount;
    M.loadClickCount     = loadClickCount;
    M.clearClickCount    = clearClickCount;
    M.saveDurationState  = saveDurationState;
    M.loadDurationState  = loadDurationState;
    M.clearDurationState = clearDurationState;

})(window.__TaskHostSDK__ = window.__TaskHostSDK__ || {});


// ================================================================
// 05-i18n.js (239 lines)
// ================================================================

/**
 * 05-国际化
 *
 * 支持英文（en）和中文（zh）两种语言。
 * 语言检测优先级：URL 参数 lang → 浏览器语言 → 默认英文
 *
 * 对外接口：
 *   t(key, ...args)   — 获取翻译文本，支持参数替换
 *   taskLabel(type)   — 获取任务类型的人类可读名称
 *   currentLang()     — 获取当前语言代码
 */
;(function(M) {
    "use strict";

    // ================================================================
    // 语言检测
    // ================================================================

    /**
     * 检测界面语言
     *
     * 优先级：
     *   1. URL 查询参数 ?lang=zh 或 ?lang=en
     *   2. 浏览器语言设置（以 zh 开头即为中文）
     *   3. 默认英文
     *
     * @returns {string} "en" 或 "zh"
     */
    var LANG = (function() {
        try {
            var lang = new URLSearchParams(window.location.search).get("lang");
            if (!lang) { return "en"; }
            if (lang === "zh" || lang === "zh-CN" || lang === "zh-TW") { return "zh"; }
            if (lang === "en") { return "en"; }
        } catch (e) {}

        if (typeof navigator !== "undefined" &&
            navigator.language &&
            navigator.language.toLowerCase().indexOf("zh") === 0) {
            return "zh";
        }

        return "en";
    })();

    // ================================================================
    // 消息字典
    // ================================================================

    /**
     * 英文消息字典
     *
     * 每条消息可以是：
     *   - 静态字符串：直接返回
     *   - 工厂函数：接收参数后返回格式化字符串
     */
    var MSG_EN = {
        click_start:    function(label, cur, total) {
            return "Tap the " + label + " to complete the task (" + cur + "/" + total + ")";
        },
        click_progress: function(cur, total) {
            return "Tapped " + cur + "/" + total;
        },
        click_restored: function(cur, total) {
            return "Resumed — already tapped " + cur + "/" + total;
        },
        click_no_target: function(label) {
            return "Look for the " + label + " on this page and tap it";
        },

        dur_start: function(label, sec) {
            return "Stay on the " + label + " page for " + sec + "s to complete the task";
        },
        dur_restored: function(remaining) {
            return "Resumed — stay for " + Math.ceil(remaining) + " more seconds";
        },
        dur_paused: "Paused",
        dur_wrong_page: function(label, sec) {
            return "Go to the " + label + " page and stay for " + sec + "s to complete the task";
        },
        dur_click_start: function(label, sec) {
            return "Click the " + label + " to start — stay for " + sec + "s to complete";
        },
        dur_complete: "Task complete!",

        task_done: "Task complete!",

        blocked: function(cb) {
            return "Click blocked by ad-shield (cb=" + cb + ")";
        },

        // 任务类型标签
        label_game_click:          "Play button",
        label_video_click:         "video player",
        label_news_click:          "article area",
        label_novel_click:         "chapter",
        label_questionnaire:       "survey form",
        label_game_stay:           "game",
        label_video_stay:          "video",
        label_news_stay:           "article",
        label_novel_stay:          "novel",
        label_fallback:            "target",

        resumed: "Resumed",
        paused:  "Paused"
    };

    /**
     * 中文消息字典
     */
    var MSG_ZH = {
        click_start: function(label, cur, total) {
            return "👆 点击" + label + "完成任务 (" + cur + "/" + total + ")";
        },
        click_progress: function(cur, total) {
            return "✅ 已点击 " + cur + "/" + total;
        },
        click_restored: function(cur, total) {
            return "✅ 已点击 " + cur + "/" + total + " — 请继续";
        },
        click_no_target: function(label) {
            return "👆 请在页面中找到 " + label + " 并点击";
        },

        dur_start: function(label, sec) {
            return "⏱ 请在" + label + "页面停留 " + sec + " 秒完成任务";
        },
        dur_restored: function(remaining) {
            return "⏱ 已恢复计时，还需停留 " + Math.ceil(remaining) + " 秒";
        },
        dur_paused: "暂停",
        dur_wrong_page: function(label, sec) {
            return "👆 请前往" + label + "页面停留 " + sec + " 秒完成任务";
        },
        dur_click_start: function(label, sec) {
            return "👆 点击" + label + "开始计时，停留 " + sec + " 秒完成任务";
        },
        dur_complete: "任务完成！",

        task_done: "🎉 任务完成！",

        blocked: function(cb) {
            return "点击被屏蔽 (cb=" + cb + ")";
        },

        // 任务类型标签
        label_game_click:          "游戏按钮",
        label_video_click:         "视频播放器",
        label_news_click:          "文章区域",
        label_novel_click:         "小说章节",
        label_questionnaire:       "问卷表单",
        label_game_stay:           "游戏",
        label_video_stay:          "视频",
        label_news_stay:           "文章",
        label_novel_stay:          "小说",
        label_fallback:            "目标元素",

        resumed: "已恢复",
        paused:  "已暂停"
    };

    /** 按当前语言选择消息字典 */
    var MSG = LANG === "zh" ? MSG_ZH : MSG_EN;

    /**
     * 任务类型 → 标签键名 映射
     * 用于 taskLabel() 函数做二次查表
     */
    var LABEL_KEY_MAP = {
        game_click:          "label_game_click",
        video_click:         "label_video_click",
        news_click:          "label_news_click",
        novel_click:         "label_novel_click",
        questionnaire_click: "label_questionnaire",
        game_stay:           "label_game_stay",
        video_stay:          "label_video_stay",
        news_stay:           "label_news_stay",
        novel_stay:          "label_novel_stay"
    };

    // ================================================================
    // 翻译函数
    // ================================================================

    /**
     * 获取翻译文本
     *
     * 用法示例：
     *   t("task_done")                    → "任务完成！"
     *   t("click_progress", 3, 5)         → "✅ 已点击 3/5"
     *   t("dur_start", "游戏", 30)        → "⏱ 请在游戏页面停留 30 秒完成任务"
     *
     * @param   {string} key - 消息键名
     * @param   {...*}   args - 格式化参数（传给工厂函数）
     * @returns {string} 翻译后的文本
     */
    function t(key) {
        var msg = MSG[key];
        if (typeof msg === "function") {
            // 工厂函数：从 arguments[1] 开始收集参数
            var args = [];
            for (var i = 1; i < arguments.length; i++) {
                args.push(arguments[i]);
            }
            return msg.apply(null, args);
        }
        return msg || key;
    }

    /**
     * 获取任务类型的人类可读标签
     *
     * 例如：
     *   taskLabel("game_click")           → "游戏按钮"
     *   taskLabel("news_stay")            → "文章"
     *
     * @param   {string} type - 任务类型（如 game_click、video_stay）
     * @returns {string} 人类可读标签
     */
    function taskLabel(type) {
        var key = LABEL_KEY_MAP[type] || "label_fallback";
        return t(key);
    }

    /**
     * 获取当前语言代码
     * @returns {string} "en" 或 "zh"
     */
    function currentLang() {
        return LANG;
    }

    // ---- 导出 ----
    M.t           = t;
    M.taskLabel   = taskLabel;
    M.currentLang = currentLang;

})(window.__TaskHostSDK__ = window.__TaskHostSDK__ || {});


// ================================================================
// 06-toast.js (181 lines)
// ================================================================

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


// ================================================================
// 07-badge.js (207 lines)
// ================================================================

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


// ================================================================
// 08-adapters.js (131 lines)
// ================================================================

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


// ================================================================
// 09-reporter.js (115 lines)
// ================================================================

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


// ================================================================
// 10-base-tracker.js (93 lines)
// ================================================================

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


// ================================================================
// 11-click-tracker.js (466 lines)
// ================================================================

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


// ================================================================
// 12-duration-tracker.js (401 lines)
// ================================================================

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


// ================================================================
// 13-ad-shield.js (67 lines)
// ================================================================

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


// ================================================================
// 14-sdk.js (300 lines)
// ================================================================

/**
 * 14-SDK 主入口
 *
 * TaskHostSDK 的装配与对外接口。
 *
 * 职责：
 *   1. 提供公共 API（init、destroy 及所有子模块导出）
 *   2. 解析 URL 参数 → 创建合适的追踪器
 *   3. 页面加载时自动初始化
 *   4. UMD 格式导出到全局 window.TaskHostSDK
 *
 * URL 参数说明：
 *   必需参数：
 *     c       — 渠道 ID（channel）
 *     t_id    — 任务 ID（task id）
 *     type    — 任务类型（如 game_click、video_stay）
 *   可选参数：
 *     target  — 任务目标（点击次数或停留秒数）
 *     cb      — 广告拦截概率（0~100）
 *     site    — 自定义站点名（不传则用当前域名）
 *     start_selector — 停留任务延迟启动选择器
 *     ver     — API 版本号（默认 v2）
 *     lang    — 界面语言（en/zh）
 *
 * 模块初始化顺序：
 *   必须按 00 → 01 → 02 → ... → 14 的顺序加载，
 *   因为后面模块依赖前面模块通过 window.__TaskHostSDK__ 注册的能力。
 */
;(function(M) {
    "use strict";

    // 从模块注册表引用依赖
    var TASK_ACTIONS       = M.TASK_ACTIONS;
    var detectAPIBase      = M.detectAPIBase;
    var RealAdapter        = M.RealAdapter;
    var ClickTracker       = M.ClickTracker;
    var DurationTracker    = M.DurationTracker;
    var saveTaskParams     = M.saveTaskParams;
    var loadTaskParams     = M.loadTaskParams;

    // ================================================================
    // URL 参数解析
    // ================================================================

    /**
     * 解析当前页面的 URL 查询参数
     *
     * 优先使用 URLSearchParams API，
     * 不支持时降级为手动字符串解析。
     *
     * @returns {Object} 键值对对象
     */
    function parseQueryParams() {
        var result = {};

        try {
            var usp = new URLSearchParams(window.location.search);
            usp.forEach(function(val, key) {
                result[key] = val;
            });
        } catch (e) {
            // URLSearchParams 不支持时的降级方案
            var qs = window.location.search.slice(1);
            if (qs) {
                var pairs = qs.split("&");
                for (var i = 0; i < pairs.length; i++) {
                    var idx = pairs[i].indexOf("=");
                    if (idx > 0) {
                        var key   = decodeURIComponent(pairs[i].slice(0, idx));
                        var value = decodeURIComponent(pairs[i].slice(idx + 1));
                        result[key] = value;
                    }
                }
            }
        }

        return result;
    }

    // ================================================================
    // SDK 单例
    // ================================================================

    var SDK = {
        /** 当前活跃的追踪器实例 */
        tracker: null,

        /** 是否已初始化 */
        initialized: false,

        /**
         * 初始化 SDK
         *
         * 执行流程：
         *   1. 解析 URL 参数（优先 URL，其次 localStorage 缓存）
         *   2. 检查参数是否有效
         *   3. 根据任务类型创建 ClickTracker 或 DurationTracker
         *   4. 启动追踪器
         *
         * @param {Object} [opts] - 配置选项
         * @param {string} [opts.apiBaseURL] - 自定义 API 地址（不传则自动检测）
         * @param {Object} [opts.adapter]    - 自定义适配器（不传则创建 RealAdapter）
         * @param {string} [opts.testSign]   - 测试签名（不传则自动计算）
         */
        init: function(opts) {
            if (this.initialized) { return; }
            opts = opts || {};

            // 1. 解析任务参数
            var params = this.resolveParams();
            if (!params) { return; }

            // 2. 确定行为类型
            var action = TASK_ACTIONS[params.type];
            if (!action) { return; }

            // 3. 确定 API 地址和适配器
            var apiBase = opts.apiBaseURL != null ? opts.apiBaseURL : detectAPIBase();
            var adapter = opts.adapter != null ? opts.adapter : new RealAdapter(apiBase, params.ver);

            // 4. 创建并启动追踪器
            this.tracker = this.createTracker(params, adapter, action, opts.testSign);
            this.tracker.start();
            this.initialized = true;
        },

        /**
         * 销毁 SDK
         * 清理追踪器并重置状态
         */
        destroy: function() {
            if (this.tracker) { this.tracker.destroy(); }
            this.tracker    = null;
            this.initialized = false;
        },

        /**
         * 解析任务参数
         *
         * 优先级：
         *   1. 从当前 URL 查询参数读取（t_id, c, type 三个缺一不可）
         *   2. 从 localStorage 缓存读取（上次访问保存的参数）
         *
         * URL 参数解析成功后会自动缓存到 localStorage。
         *
         * @returns {Object|null} 任务参数对象或 null
         */
        resolveParams: function() {
            var qp = parseQueryParams();

            if (qp.t_id && qp.c && qp.type) {
                // URL 中有完整参数 → 构建参数对象并缓存
                var params = {
                    t_id:           qp.t_id,
                    c:              qp.c,
                    type:           qp.type,
                    target:         qp.target || "0",
                    cb:             qp.cb     || "0",
                    site:           qp.site   || undefined,
                    start_selector: qp.start_selector || undefined,
                    ver:            qp.ver    || "v2"
                };
                saveTaskParams(params);
                return params;
            }

            // URL 中没有完整参数 → 尝试从缓存读取
            return loadTaskParams() || null;
        },

        /**
         * 根据任务行为类型创建对应的追踪器
         *
         * @param   {Object} params   - 任务参数
         * @param   {Object} adapter  - 适配器实例
         * @param   {string} action   - "click" 或 "stay"
         * @param   {string} testSign - 测试签名
         * @returns {BaseTracker} ClickTracker 或 DurationTracker 实例
         */
        createTracker: function(params, adapter, action, testSign) {
            if (action === "click") {
                return new ClickTracker(params, adapter, testSign);
            }
            return new DurationTracker(params, adapter, testSign);
        }
    };

    // ================================================================
    // 自动初始化
    // ================================================================

    /**
     * 页面加载完成后自动初始化
     *
     * 检测条件：
     *   URL 中有完整参数（t_id + c + type） 或 localStorage 中有缓存参数
     *
     * 满足条件时自动调用 SDK.init()。
     */
    function autoInit() {
        var qp = parseQueryParams();
        if ((qp.t_id && qp.c && qp.type) || loadTaskParams()) {
            SDK.init();
        }
    }

    // 注册 DOMContentLoaded
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", autoInit);
    } else {
        // DOM 已加载完毕（脚本被异步/延迟加载时）
        setTimeout(autoInit, 0);
    }

    // ================================================================
    // 公共 API 导出
    // ================================================================

    /**
     * 将所有公开 API 挂载到全局 window.TaskHostSDK
     *
     * 导出的接口分以下几类：
     *
     * 主入口：
     *   TaskHostSDK.init(opts)     — 初始化 SDK
     *   TaskHostSDK.destroy()      — 销毁 SDK
     *   TaskHostSDK.TaskHostSDK     — SDK 单例（原始对象引用）
     *
     * 追踪器类：
     *   TaskHostSDK.ClickTracker       — 点击任务追踪器
     *   TaskHostSDK.DurationTracker    — 停留任务追踪器
     *
     * 适配器：
     *   TaskHostSDK.MockAdapter        — 模拟适配器（测试用）
     *   TaskHostSDK.RealAdapter        — 真实 HTTP 适配器
     *
     * 上报器：
     *   TaskHostSDK.Reporter           — 上报器（低层 API）
     *
     * UI 组件：
     *   TaskHostSDK.showToast(msg, opts) — 显示 toast
     *   TaskHostSDK.dismiss()            — 关闭当前 toast
     *   TaskHostSDK.createBadge()        — 创建圆形倒计时徽章
     *   TaskHostSDK.AdShield             — 广告屏蔽模拟器
     *
     * 国际化：
     *   TaskHostSDK.t(key, ...args)    — 翻译函数
     *   TaskHostSDK.taskLabel(type)    — 任务类型标签
     *   TaskHostSDK.currentLang()      — 当前语言代码
     *
     * 存储工具：
     *   TaskHostSDK.saveTaskParams / loadTaskParams / clearTaskParams
     *   TaskHostSDK.saveClickCount / loadClickCount / clearClickCount
     *   TaskHostSDK.saveDurationState / loadDurationState / clearDurationState
     */
    var exports = {};

    // 主入口
    exports.init        = function(opts) { SDK.init(opts); };
    exports.destroy     = function() { SDK.destroy(); };
    exports.TaskHostSDK = SDK;

    // 追踪器
    exports.ClickTracker    = M.ClickTracker;
    exports.DurationTracker = M.DurationTracker;

    // 适配器
    exports.MockAdapter = M.MockAdapter;
    exports.RealAdapter = M.RealAdapter;

    // 上报器
    exports.Reporter = M.Reporter;

    // UI
    exports.showToast   = M.showToast;
    exports.dismiss     = M.dismissToast;
    exports.createBadge = M.createBadge;
    exports.AdShield    = M.AdShield;

    // 国际化
    exports.t           = M.t;
    exports.taskLabel   = M.taskLabel;
    exports.currentLang = M.currentLang;

    // 存储工具
    exports.saveTaskParams     = M.saveTaskParams;
    exports.loadTaskParams     = M.loadTaskParams;
    exports.clearTaskParams    = M.clearTaskParams;
    exports.saveClickCount     = M.saveClickCount;
    exports.loadClickCount     = M.loadClickCount;
    exports.clearClickCount    = M.clearClickCount;
    exports.saveDurationState  = M.saveDurationState;
    exports.loadDurationState  = M.loadDurationState;
    exports.clearDurationState = M.clearDurationState;

    // 挂载全局
    window.TaskHostSDK = exports;

})(window.__TaskHostSDK__ = window.__TaskHostSDK__ || {});


