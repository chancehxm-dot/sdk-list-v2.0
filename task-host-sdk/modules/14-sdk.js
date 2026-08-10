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
