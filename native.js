/**
 * native.js — WebView 原生桥接层
 * 封装 window.JSNative 通信，提供 Chrome Tab 和激励视频接口。
 * 原生不可用时自动降级到 H5 方案。
 */

var NativeBridge = (function () {
    'use strict';

    /* ============================================================
     * 内部状态
     * ============================================================ */

    var _available = false;
    var _registry = {};          // requestId → { callback, timerId }
    var _seq = 0;
    var TIMEOUT = 60000;         // 回调超时时间（毫秒）

    /* ============================================================
     * 工具函数
     * ============================================================ */

    /** 生成唯一请求 ID */
    function makeRequestId() {
        _seq++;
        return 'nb_' + Date.now() + '_' + _seq;
    }

    /** 注册回调，设定超时 */
    function register(requestId, callback) {
        var timerId = setTimeout(function () {
            console.log('[native] 回调超时 requestId=' + requestId);
            fireCallback(requestId, new Error('原生回调超时'));
        }, TIMEOUT);

        _registry[requestId] = {
            callback: callback,
            timerId: timerId
        };
        console.log('[native] 注册回调 requestId=' + requestId);
    }

    /** 触发回调（一次性，触发后自动清理） */
    function fireCallback(requestId, err, result) {
        var entry = _registry[requestId];
        if (!entry) {
            console.log('[native] 回调已触发或不存在 requestId=' + requestId);
            return;
        }

        clearTimeout(entry.timerId);
        delete _registry[requestId];

        console.log('[native] 触发回调 requestId=' + requestId + ' err=' + (err ? err.message : 'null'));
        entry.callback(err, result);
    }

    /** 解析原生回调参数（兼容 string JSON 和 object） */
    function parseResult(raw) {
        if (typeof raw === 'string') {
            try {
                return JSON.parse(raw);
            } catch (e) {
                console.log('[native] JSON 解析失败: ' + e.message);
                return { id: '', code: -1, msg: 'Invalid JSON' };
            }
        }
        return raw || { id: '', code: -1, msg: 'No result' };
    }

    /* ============================================================
     * 初始化检测
     * ============================================================ */

    function init() {
        if (window.JSNative && typeof window.JSNative.postMessage === 'function') {
            _available = true;
            console.log('[native] JSNative 接口已就绪');
        } else {
            console.log('[native] JSNative 接口不可用，使用 H5 降级方案');
        }

        // 安装全局回调 — 客户端通过这些函数回传结果
        window.onChromeClose = function (raw) {
            var r = parseResult(raw);
            console.log('[native] onChromeClose id=' + r.id + ' code=' + r.code);
            if (r.code === 0) {
                fireCallback(r.id, null, r);
            } else {
                fireCallback(r.id, new Error(r.msg || 'Chrome 操作失败 (code=' + r.code + ')'), r);
            }
        };

        window.onVideoClose = function (raw) {
            var r = parseResult(raw);
            console.log('[native] onVideoClose id=' + r.id + ' code=' + r.code);
            if (r.code === 0) {
                fireCallback(r.id, null, r);
            } else {
                fireCallback(r.id, new Error(r.msg || '视频播放失败 (code=' + r.code + ')'), r);
            }
        };
    }

    /* ============================================================
     * 公开接口
     * ============================================================ */

    /**
     * 通过原生 Chrome Tab 打开链接。
     * 原生不可用时自动降级为 window.location.href 跳转。
     *
     * @param {string} taskId   - 任务 ID（用于回调匹配）
     * @param {string} url      - 目标 URL
     * @param {Function} [callback] - Chrome 关闭后的回调(err)
     */
    function openChrome(taskId, url, callback) {
        if (!_available) {
            console.log('[native] 降级：window.location.href=' + url);
            window.location.href = url;
            return;
        }

        var requestId = makeRequestId();
        if (callback) {
            register(requestId, callback);
        }

        var message = JSON.stringify({
            id: requestId,
            action: 'open',
            url: url
        });
        window.JSNative.postMessage(message);
        console.log('[native] openChrome taskId=' + taskId + ' url=' + url);
    }

    /**
     * 播放激励视频。
     * 原生不可用时直接返回错误。
     *
     * @param {string} taskId   - 任务 ID
     * @param {Function} callback - 视频关闭后的回调(err, result)
     */
    function openVideo(taskId, callback) {
        if (!_available) {
            console.log('[native] 原生不可用，无法播放激励视频');
            callback(new Error('当前环境不支持激励视频'));
            return;
        }

        var requestId = makeRequestId();
        register(requestId, callback);

        var message = JSON.stringify({
            id: requestId,
            action: 'video'
        });
        window.JSNative.postMessage(message);
        console.log('[native] openVideo taskId=' + taskId);
    }

    // 启动时自动检测
    init();

    return {
        isAvailable: _available,
        openChrome: openChrome,
        openVideo: openVideo
    };
})();
