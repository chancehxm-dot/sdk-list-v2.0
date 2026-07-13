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
