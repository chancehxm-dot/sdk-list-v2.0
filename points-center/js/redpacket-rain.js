/**
 * redpacket-rain.js — 红包雨模块
 * 全屏红包掉落动画，用户点击抢红包随机获得积分。
 *
 * 依赖：api.js（CONFIG, buildSign, getTs, apiGet）
 * 加载顺序：必须在本脚本之前加载 api.js
 *
 * 预留接口（后端未就绪时自动降级为模拟模式）：
 *   GET /api/v2/redpacket/status  签名: md5(c_id + user_id + ts + secretKey)
 *   GET /api/v2/redpacket/claim   签名: md5(c_id + user_id + ts + secretKey)
 */

var RedPacketRain = (function () {
    'use strict';

    /* ============================================================
     * 默认配置
     * ============================================================ */

    var DEFAULTS = {
        duration: 10000,        // 红包雨持续时间（毫秒）
        spawnInterval: 350,     // 红包生成间隔（毫秒）
        fallDurationMin: 2500,  // 单个红包最短掉落时间（毫秒）
        fallDurationMax: 4000,  // 单个红包最长掉落时间（毫秒）
        packetSizeMin: 50,      // 红包最小尺寸（px）
        packetSizeMax: 70,      // 红包最大尺寸（px）
        swingRange: 30          // 左右摆动幅度（px）
    };

    /* ============================================================
     * 内部状态
     * ============================================================ */

    var _state = {
        running: false,
        claimed: 0,
        totalPoints: 0,
        packetCount: 0,
        maxClaimCount: 10,
        overlay: null,
        summaryPanel: null,
        timers: [],
        demoMode: false
    };

    /* ============================================================
     * 模拟数据（后端接口未就绪时使用）
     * ============================================================ */

    var DEMO_REWARDS = [1, 2, 3, 5, 8, 10, 15, 20, 30, 50];

    function randomDemoReward() {
        return DEMO_REWARDS[Math.floor(Math.random() * DEMO_REWARDS.length)];
    }

    /* ============================================================
     * DOM 工具
     * ============================================================ */

    /** 注入红包雨专用样式（仅注入一次） */
    function injectStyles() {
        if (document.getElementById('redpacket-rain-styles')) return;

        var style = document.createElement('style');
        style.id = 'redpacket-rain-styles';
        style.textContent = [
            '/* 红包雨覆盖层 */',
            '.rp-overlay {',
            '  position: fixed; top: 0; left: 0; width: 100%; height: 100%;',
            '  background: rgba(0,0,0,0.65); z-index: 99990;',
            '  overflow: hidden; -webkit-tap-highlight-color: transparent;',
            '  display: flex; flex-direction: column; align-items: center;',
            '}',
            '/* 顶部倒计时条 */',
            '.rp-header {',
            '  width: 100%; padding: 12px 20px;',
            '  display: flex; justify-content: space-between; align-items: center;',
            '  color: #FFD700; font-size: 16px; font-weight: 700;',
            '  text-shadow: 0 1px 4px rgba(0,0,0,0.5); z-index: 1;',
            '}',
            '.rp-close-btn {',
            '  width: 32px; height: 32px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.6);',
            '  background: rgba(0,0,0,0.3); color: #fff; font-size: 18px;',
            '  cursor: pointer; display: flex; align-items: center; justify-content: center;',
            '}',
            '.rp-countdown {',
            '  background: rgba(0,0,0,0.4); padding: 4px 12px; border-radius: 14px;',
            '  font-size: 14px;',
            '}',
            '/* 红包掉落区域 */',
            '.rp-stage {',
            '  position: absolute; top: 0; left: 0; width: 100%; height: 100%;',
            '  pointer-events: none;',
            '}',
            '/* 单个红包 */',
            '.rp-packet {',
            '  position: absolute; top: -80px;',
            '  pointer-events: auto; cursor: pointer;',
            '  display: flex; align-items: center; justify-content: center;',
            '  font-size: 32px; line-height: 1;',
            '  animation-name: rpFall;',
            '  animation-timing-function: linear;',
            '  animation-fill-mode: forwards;',
            '  -webkit-tap-highlight-color: transparent;',
            '  user-select: none; -webkit-user-select: none;',
            '  z-index: 1;',
            '}',
            '.rp-packet:active { transform: scale(1.2); }',
            '@keyframes rpFall {',
            '  0%   { transform: translateY(0) rotate(0deg); opacity: 1; }',
            '  60%  { opacity: 1; }',
            '  100% { transform: translateY(105vh) rotate(360deg); opacity: 0.4; }',
            '}',
            '/* 红包爆开效果 */',
            '.rp-packet.pop {',
            '  animation: rpPop 0.4s ease-out forwards !important;',
            '  pointer-events: none;',
            '}',
            '@keyframes rpPop {',
            '  0%   { transform: scale(1); opacity: 1; }',
            '  50%  { transform: scale(1.6); opacity: 0.8; }',
            '  100% { transform: scale(2.5); opacity: 0; }',
            '}',
            '/* 获得积分弹窗 */',
            '.rp-reward-popup {',
            '  position: absolute;',
            '  font-size: 24px; font-weight: 900; color: #FFD700;',
            '  text-shadow: 0 0 10px rgba(255,215,0,0.8), 0 2px 4px rgba(0,0,0,0.5);',
            '  pointer-events: none; z-index: 2;',
            '  animation: rpRewardFloat 1.2s ease-out forwards;',
            '}',
            '@keyframes rpRewardFloat {',
            '  0%   { transform: translateY(0) scale(0.5); opacity: 1; }',
            '  40%  { transform: translateY(-40px) scale(1.2); opacity: 1; }',
            '  100% { transform: translateY(-90px) scale(0.8); opacity: 0; }',
            '}',
            '/* 结束汇总面板 */',
            '.rp-summary {',
            '  position: absolute; top: 50%; left: 50%;',
            '  transform: translate(-50%, -50%) scale(0);',
            '  background: linear-gradient(180deg, #FF2D2D, #CC0000);',
            '  color: #FFD700; border-radius: 20px; padding: 30px 24px;',
            '  text-align: center; z-index: 10;',
            '  box-shadow: 0 8px 40px rgba(255,0,0,0.4);',
            '  min-width: 260px;',
            '  animation: rpSummaryIn 0.4s ease-out forwards;',
            '}',
            '@keyframes rpSummaryIn {',
            '  0%   { transform: translate(-50%, -50%) scale(0); }',
            '  70%  { transform: translate(-50%, -50%) scale(1.05); }',
            '  100% { transform: translate(-50%, -50%) scale(1); }',
            '}',
            '.rp-summary-icon { font-size: 56px; margin-bottom: 8px; }',
            '.rp-summary-title { font-size: 20px; font-weight: 800; margin-bottom: 4px; }',
            '.rp-summary-pts { font-size: 36px; font-weight: 900; margin: 8px 0; }',
            '.rp-summary-sub { font-size: 13px; color: #FFE0B2; margin-bottom: 16px; }',
            '.rp-summary-btn {',
            '  display: block; width: 100%; padding: 12px; border: none;',
            '  border-radius: 24px; background: #FFD700; color: #CC0000;',
            '  font-size: 16px; font-weight: 800; cursor: pointer;',
            '}',
            '.rp-summary-btn:active { opacity: 0.8; }',
            '/* 红包雨入口横幅 */',
            '.rp-entry-banner {',
            '  margin: 0 16px 16px; padding: 14px 16px;',
            '  background: linear-gradient(135deg, #FF2D2D 0%, #FF6B00 100%);',
            '  border-radius: 14px; display: flex; align-items: center;',
            '  justify-content: space-between; cursor: pointer;',
            '  box-shadow: 0 3px 12px rgba(255,45,45,0.35);',
            '  position: relative; overflow: hidden;',
            '  -webkit-tap-highlight-color: transparent;',
            '  animation: rpBannerPulse 2s ease-in-out infinite;',
            '}',
            '@keyframes rpBannerPulse {',
            '  0%, 100% { box-shadow: 0 3px 12px rgba(255,45,45,0.35); }',
            '  50%      { box-shadow: 0 3px 24px rgba(255,45,45,0.55); }',
            '}',
            '.rp-entry-banner:active { transform: scale(0.98); opacity: 0.9; }',
            '.rp-entry-banner::before {',
            '  content: ""; position: absolute; top: -50%; left: -50%;',
            '  width: 200%; height: 200%;',
            '  background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 60%);',
            '  animation: rpBannerShine 3s linear infinite;',
            '}',
            '@keyframes rpBannerShine {',
            '  0%   { transform: translate(-30%, -30%); }',
            '  100% { transform: translate(30%, 30%); }',
            '}',
            '.rp-entry-icon { font-size: 32px; z-index: 1; }',
            '.rp-entry-info { z-index: 1; flex: 1; margin-left: 12px; }',
            '.rp-entry-title { font-size: 16px; font-weight: 800; color: #fff; }',
            '.rp-entry-sub { font-size: 11px; color: #FFE0B2; margin-top: 2px; }',
            '.rp-entry-arrow {',
            '  z-index: 1; background: rgba(255,255,255,0.25);',
            '  padding: 6px 14px; border-radius: 16px;',
            '  color: #fff; font-size: 13px; font-weight: 700;',
            '}'
        ].join('\n');
        document.head.appendChild(style);
    }

    /** 创建覆盖层 + 红包掉落区域 */
    function createOverlay() {
        var overlay = document.createElement('div');
        overlay.className = 'rp-overlay';

        // 顶部信息栏
        var header = document.createElement('div');
        header.className = 'rp-header';
        header.innerHTML = '<span>🧧 Red Packet Rain</span>'
            + '<span class="rp-countdown" id="rpCountdown"></span>'
            + '<button class="rp-close-btn" id="rpCloseBtn">&times;</button>';
        overlay.appendChild(header);

        // 红包掉落区域
        var stage = document.createElement('div');
        stage.className = 'rp-stage';
        stage.id = 'rpStage';
        overlay.appendChild(stage);

        document.body.appendChild(overlay);
        _state.overlay = overlay;

        // 关闭按钮
        document.getElementById('rpCloseBtn').addEventListener('click', function () {
            endRain();
        });
    }

    /** 移除覆盖层 */
    function removeOverlay() {
        if (_state.overlay && _state.overlay.parentNode) {
            _state.overlay.parentNode.removeChild(_state.overlay);
        }
        _state.overlay = null;
    }

    /** 创建一个红包 DOM 节点 */
    function createPacket() {
        var el = document.createElement('div');
        el.className = 'rp-packet';

        // 随机尺寸
        var size = DEFAULTS.packetSizeMin
            + Math.floor(Math.random() * (DEFAULTS.packetSizeMax - DEFAULTS.packetSizeMin));
        el.style.width = size + 'px';
        el.style.height = (size * 1.15) + 'px';

        // 随机水平位置（留出边距）
        var maxLeft = window.innerWidth - size - 10;
        var left = 10 + Math.random() * maxLeft;
        el.style.left = left + 'px';

        // 随机掉落时长
        var duration = DEFAULTS.fallDurationMin
            + Math.random() * (DEFAULTS.fallDurationMax - DEFAULTS.fallDurationMin);
        el.style.animationDuration = duration + 'ms';

        // 随机摆动（用 translateX 关键帧覆写）
        var swing = Math.floor(Math.random() * DEFAULTS.swingRange);
        var swingKeyframes = [
            '@keyframes rpSwing' + _state.packetCount + ' {',
            '  0%   { transform: translateY(0) translateX(0) rotate(0deg); opacity: 1; }',
            '  25%  { transform: translateY(25vh) translateX(' + swing + 'px) rotate(90deg); }',
            '  50%  { transform: translateY(50vh) translateX(-' + swing + 'px) rotate(180deg); }',
            '  75%  { transform: translateY(75vh) translateX(' + Math.floor(swing / 2) + 'px) rotate(270deg); }',
            '  100% { transform: translateY(105vh) translateX(0) rotate(360deg); opacity: 0.3; }',
            '}'
        ].join('\n');

        var styleSheet = document.getElementById('redpacket-rain-styles');
        if (styleSheet) {
            styleSheet.textContent += '\n' + swingKeyframes;
        }

        el.style.animationName = 'rpSwing' + _state.packetCount;
        el.style.animationTimingFunction = 'linear';
        el.style.animationFillMode = 'forwards';
        el.textContent = '🧧';

        // 点击事件
        el.addEventListener('click', function (e) {
            e.stopPropagation();
            onPacketClick(el);
        });

        _state.packetCount++;
        return el;
    }

    /** 显示获得积分弹窗 */
    function showRewardPopup(x, y, points) {
        var el = document.createElement('div');
        el.className = 'rp-reward-popup';
        el.textContent = '+' + points;
        el.style.left = (x - 30) + 'px';
        el.style.top = (y - 20) + 'px';
        document.getElementById('rpStage').appendChild(el);

        // 动画结束后移除
        setTimeout(function () {
            if (el.parentNode) el.parentNode.removeChild(el);
        }, 1300);
    }

    /** 显示结束汇总面板 */
    function showSummary() {
        var panel = document.createElement('div');
        panel.className = 'rp-summary';
        panel.id = 'rpSummary';
        panel.innerHTML = '<div class="rp-summary-icon">🧧</div>'
            + '<div class="rp-summary-title">Red Packet Rain Over!</div>'
            + '<div class="rp-summary-pts">+' + _state.totalPoints + ' pts</div>'
            + '<div class="rp-summary-sub">You grabbed ' + _state.claimed + ' red packet'
            + (_state.claimed !== 1 ? 's' : '') + '</div>'
            + '<button class="rp-summary-btn" onclick="RedPacketRain.closeSummary()">Nice!</button>';

        _state.overlay.appendChild(panel);
        _state.summaryPanel = panel;
    }

    /* ============================================================
     * 红包点击处理
     * ============================================================ */

    function onPacketClick(el) {
        if (!_state.running) return;

        // 已爆开的红包不再响应
        if (el.classList.contains('pop')) return;

        // 达到领取上限
        if (_state.claimed >= _state.maxClaimCount) return;

        // 爆开动画
        el.classList.add('pop');

        // 获取红包屏幕位置
        var rect = el.getBoundingClientRect();
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height / 2;

        // 调用领取接口（或模拟）
        claimOne(function (err, points) {
            if (err) {
                console.log('[redpacket] claim failed: ' + err.message);
                // 失败时红包消失但不加分
                if (el.parentNode) el.parentNode.removeChild(el);
                return;
            }

            _state.claimed++;
            _state.totalPoints += points;

            // 显示获得积分弹窗
            showRewardPopup(cx, cy, points);

            // 更新倒计时显示
            updateCountdownDisplay();

            // 移除红包 DOM
            if (el.parentNode) el.parentNode.removeChild(el);

            console.log('[redpacket] claimed +' + points + ' (total: ' + _state.totalPoints + ', count: ' + _state.claimed + ')');
        });
    }

    /* ============================================================
     * 倒计时
     * ============================================================ */

    function updateCountdownDisplay() {
        var el = document.getElementById('rpCountdown');
        if (!el) return;
        var remain = _state.maxClaimCount - _state.claimed;
        el.textContent = remain + ' left';
        if (remain <= 2) {
            el.style.color = '#FFD700';
        }
    }

    /* ============================================================
     * 红包生成循环
     * ============================================================ */

    function spawnLoop() {
        if (!_state.running) return;

        var stage = document.getElementById('rpStage');
        if (!stage) return;

        var packet = createPacket();
        stage.appendChild(packet);

        // 掉落结束后自动移除
        var fallDuration = DEFAULTS.fallDurationMax + 500;
        var removeTimer = setTimeout(function () {
            if (packet.parentNode && !packet.classList.contains('pop')) {
                packet.parentNode.removeChild(packet);
            }
        }, fallDuration);
        _state.timers.push(removeTimer);

        // 继续生成下一个
        var nextTimer = setTimeout(function () {
            spawnLoop();
        }, DEFAULTS.spawnInterval + Math.random() * 200);
        _state.timers.push(nextTimer);
    }

    /* ============================================================
     * 开始 / 结束
     * ============================================================ */

    function beginRain() {
        _state.running = true;
        _state.claimed = 0;
        _state.totalPoints = 0;
        _state.packetCount = 0;

        injectStyles();
        createOverlay();
        updateCountdownDisplay();

        // 启动红包生成
        spawnLoop();

        // 总时长结束后停止
        var endTimer = setTimeout(function () {
            endRain();
        }, DEFAULTS.duration);
        _state.timers.push(endTimer);

        console.log('[redpacket] rain started (duration=' + DEFAULTS.duration + 'ms, maxClaim=' + _state.maxClaimCount + ')');
    }

    function endRain() {
        _state.running = false;

        // 清除所有定时器
        for (var i = 0; i < _state.timers.length; i++) {
            clearTimeout(_state.timers[i]);
        }
        _state.timers = [];

        // 清除残留红包
        var stage = document.getElementById('rpStage');
        if (stage) {
            var packets = stage.querySelectorAll('.rp-packet:not(.pop)');
            for (var j = 0; j < packets.length; j++) {
                if (packets[j].parentNode) packets[j].parentNode.removeChild(packets[j]);
            }
        }

        // 显示汇总（如果有抢到红包）
        if (_state.totalPoints > 0) {
            showSummary();
        } else {
            // 什么都没抢到 — 直接关闭
            removeOverlay();
        }

        console.log('[redpacket] rain ended (claimed=' + _state.claimed + ', points=' + _state.totalPoints + ')');
    }

    /** 关闭汇总面板并移除覆盖层 */
    function closeSummary() {
        if (_state.summaryPanel && _state.summaryPanel.parentNode) {
            _state.summaryPanel.parentNode.removeChild(_state.summaryPanel);
        }
        _state.summaryPanel = null;
        removeOverlay();

        // 通知积分中心刷新积分
        if (typeof window.dispatchEvent === 'function') {
            window.dispatchEvent(new CustomEvent('redpacket:close'));
        }
    }

    /* ============================================================
     * API 接口（预留，后端未就绪时使用模拟数据）
     * ============================================================ */

    /**
     * 查询红包雨状态。
     * GET /api/v2/redpacket/status
     * 响应（AES 加密 data）：{ available: bool, remain_count: int }
     */
    function fetchStatus(callback) {
        var ts = getTs();
        var sign = buildSign([CONFIG.cId, CONFIG.userId, ts], true);
        var url = CONFIG.apiBase + '/redpacket/status?c_id=' + encodeURIComponent(CONFIG.cId)
            + '&user_id=' + encodeURIComponent(CONFIG.userId)
            + '&ts=' + ts + '&sign=' + sign;

        console.log('[redpacket] fetchStatus GET ' + url);

        apiGet(url, function (err, resp) {
            if (err) {
                console.log('[redpacket] fetchStatus failed, using demo mode: ' + err.message);
                _state.demoMode = true;
                callback(null, { available: true, remain_count: 10 });
                return;
            }

            resp = decryptResponseData(resp, ts);
            if (resp._decrypted && typeof resp._decrypted === 'object') {
                callback(null, resp._decrypted);
            } else if (resp.code === 0 && resp.data) {
                callback(null, resp);
            } else {
                // 后端未就绪 → 模拟模式
                console.log('[redpacket] fetchStatus code=' + (resp ? resp.code : '?') + ', using demo mode');
                _state.demoMode = true;
                callback(null, { available: true, remain_count: 10 });
            }
        });
    }

    /**
     * 领取一个红包。
     * GET /api/v2/redpacket/claim
     * 响应（AES 加密 data）：{ points: int }
     */
    function claimOne(callback) {
        if (_state.demoMode) {
            // 模拟模式：延迟 100-300ms 后返回随机积分
            setTimeout(function () {
                callback(null, randomDemoReward());
            }, 100 + Math.random() * 200);
            return;
        }

        var ts = getTs();
        var sign = buildSign([CONFIG.cId, CONFIG.userId, ts], true);
        var url = CONFIG.apiBase + '/redpacket/claim?c_id=' + encodeURIComponent(CONFIG.cId)
            + '&user_id=' + encodeURIComponent(CONFIG.userId)
            + '&ts=' + ts + '&sign=' + sign;

        apiGet(url, function (err, resp) {
            if (err) {
                callback(err);
                return;
            }

            resp = decryptResponseData(resp, ts);
            if (resp._decrypted && typeof resp._decrypted === 'object') {
                callback(null, resp._decrypted.points || randomDemoReward());
            } else if (resp.code === 0 && resp.data) {
                callback(null, resp.data.points || randomDemoReward());
            } else {
                callback(new Error(resp.msg || 'claim failed'));
            }
        });
    }

    /* ============================================================
     * 公开接口
     * ============================================================ */

    /**
     * 启动红包雨。
     * 先调用 status 接口检查是否可用，通过后开始掉落动画。
     */
    function start() {
        if (_state.running) {
            console.log('[redpacket] already running');
            return;
        }

        console.log('[redpacket] checking status...');

        fetchStatus(function (err, data) {
            if (err) {
                console.log('[redpacket] status error: ' + err.message);
                // 即使接口失败，也允许进入（模拟模式）
                _state.demoMode = true;
                _state.maxClaimCount = 10;
                beginRain();
                return;
            }

            if (data && data.available) {
                _state.maxClaimCount = data.remain_count || 10;
                _state.demoMode = false;
                beginRain();
            } else {
                console.log('[redpacket] not available: ' + JSON.stringify(data));
                // 后端未就绪 → 模拟模式
                _state.demoMode = true;
                _state.maxClaimCount = 10;
                beginRain();
            }
        });
    }

    /** 停止红包雨 */
    function stop() {
        if (!_state.running) return;
        endRain();
    }

    /** 关闭汇总面板 */
    function closeSummary() {
        if (_state.summaryPanel && _state.summaryPanel.parentNode) {
            _state.summaryPanel.parentNode.removeChild(_state.summaryPanel);
        }
        _state.summaryPanel = null;
        removeOverlay();

        if (typeof window.dispatchEvent === 'function') {
            window.dispatchEvent(new CustomEvent('redpacket:close'));
        }
    }

    /** 销毁：清理所有 DOM 和定时器 */
    function destroy() {
        stop();
        removeOverlay();
        _state.timers = [];
    }

    /** 是否正在运行 */
    function isRunning() {
        return _state.running;
    }

    /* ============================================================
     * 导出
     * ============================================================ */

    return {
        start: start,
        stop: stop,
        closeSummary: closeSummary,
        destroy: destroy,
        isRunning: isRunning
    };
})();
