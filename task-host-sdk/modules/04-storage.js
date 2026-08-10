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
