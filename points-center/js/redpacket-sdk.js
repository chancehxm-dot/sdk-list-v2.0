/**
 * redpacket-sdk.js — 红包雨 SDK
 * ============================================================
 * 自包含模块：浮动礼包入口 + 开启倒计时 + 红包雨游戏。
 *
 * 使用方式：
 *   RedPacketSDK.init({
 *       cId: 'test2',
 *       userId: 'demo_user_002',
 *       secretKey: '00fd3c92cecb228f39743ad7a6584062',
 *       apiBase: 'https://api.zombifieds.com/api/v2',
 *       schedule: ['09:00', '12:00', '15:00', '18:00', '21:00'],
 *       windowDuration: 10  // 每个时段开放多少分钟
 *   });
 *
 * 依赖（在加载本脚本之前引入）：
 *   ../shared/libs/crypto-js.min.js
 *   js/api.js（CONFIG, buildSign, getTs, apiGet, decryptResponseData）
 *
 * 预留接口（后端未就绪时使用本地时间判断）：
 *   GET /api/v2/redpacket/config  → { schedule: [...], window_duration: int, available: bool }
 *   GET /api/v2/redpacket/claim   → { points: int }
 * ============================================================
 */

var RedPacketSDK = (function () {
    'use strict';

    /* ============================================================
     * 默认配置
     * ============================================================ */

    var DEFAULTS = {
        // 开放时段（空 = 使用服务器返回的配置）
        schedule: ['09:00', '12:00', '15:00', '18:00', '21:00'],
        windowDuration: 10,      // 每个时段开放分钟数
        // 游戏参数
        rainDuration: 10000,     // 红包雨持续时间（ms）
        spawnInterval: 350,      // 红包生成间隔（ms）
        fallDurationMin: 2800,   // 最短掉落时间
        fallDurationMax: 4500,   // 最长掉落时间
        maxClaimCount: 10,       // 每次最多可抢红包数
        // UI 位置
        posBottom: 100,
        posRight: 16
    };

    /* ============================================================
     * 全局状态
     * ============================================================ */

    var _cfg = {};               // 合并后的配置
    var _entryEl = null;         // 浮动入口 DOM
    var _countdownEl = null;     // 倒计时 DOM
    var _countdownTimer = null;  // 倒计时 setInterval
    var _openStart = null;       // 当前开放窗口起始时间（Date）
    var _openEnd = null;         // 当前开放窗口结束时间（Date）
    var _isOpen = false;         // 当前是否在开放窗口内
    var _demoMode = true;        // 是否模拟模式

    // 游戏状态
    var _rainRunning = false;
    var _rainClaimed = 0;
    var _rainPoints = 0;
    var _rainPackets = [];
    var _rainRafId = null;
    var _rainSpawnId = null;
    var _rainTimers = [];
    var _rainOverlay = null;

    /* ============================================================
     * 时间 / 调度工具
     * ============================================================ */

    /** 将 "HH:MM" 字符串解析为今天的 Date */
    function parseTime(timeStr) {
        var parts = timeStr.split(':');
        var h = parseInt(parts[0], 10);
        var m = parseInt(parts[1], 10);
        var d = new Date();
        d.setHours(h, m, 0, 0);
        return d;
    }

    /** 找到下一个开放窗口的起始时间 */
    function findNextOpening(schedule, windowMin) {
        var now = Date.now();
        var minDist = Infinity;
        var next = null;

        for (var i = 0; i < schedule.length; i++) {
            var candidate = parseTime(schedule[i]).getTime();

            // 今天已经过了 → 推到明天
            if (candidate <= now) {
                candidate += 24 * 60 * 60 * 1000;
            }

            var dist = candidate - now;
            if (dist < minDist) {
                minDist = dist;
                next = candidate;
            }
        }

        // 也检查今天的（如果当前时间还没到这个时刻）
        for (var j = 0; j < schedule.length; j++) {
            var todayCandidate = parseTime(schedule[j]).getTime();
            if (todayCandidate > now && todayCandidate - now < minDist) {
                minDist = todayCandidate - now;
                next = todayCandidate;
            }
        }

        return next;
    }

    /** 检查当前是否在开放窗口内 */
    function checkOpenWindow(schedule, windowMin) {
        var now = Date.now();
        var windowMs = windowMin * 60 * 1000;

        for (var i = 0; i < schedule.length; i++) {
            var start = parseTime(schedule[i]).getTime();
            var end = start + windowMs;

            if (now >= start && now < end) {
                return { open: true, start: start, end: end };
            }
        }

        return { open: false, start: null, end: null };
    }

    /** 格式化倒计时 */
    function formatCountdown(ms) {
        if (ms <= 0) return 'Opening...';
        var totalSec = Math.ceil(ms / 1000);
        var h = Math.floor(totalSec / 3600);
        var m = Math.floor((totalSec % 3600) / 60);
        var s = totalSec % 60;

        if (h > 0) {
            return h + 'h ' + (m < 10 ? '0' : '') + m + 'm ' + (s < 10 ? '0' : '') + s + 's';
        }
        if (m > 0) {
            return m + 'm ' + (s < 10 ? '0' : '') + s + 's';
        }
        return s + 's';
    }

    /** 简短倒计时（用在入口按钮下方） */
    function formatShortCountdown(ms) {
        if (ms <= 0) return 'OPEN';
        var totalSec = Math.ceil(ms / 1000);
        var h = Math.floor(totalSec / 3600);
        var m = Math.floor((totalSec % 3600) / 60);
        var s = totalSec % 60;

        if (h > 0) return h + 'h ' + m + 'm';
        if (m > 0) return m + ':' + (s < 10 ? '0' : '') + s;
        return '0:' + (s < 10 ? '0' : '') + s;
    }

    /* ============================================================
     * Toast
     * ============================================================ */

    function showToast(msg, type) {
        var t = document.createElement('div');
        t.textContent = msg;
        t.style.cssText = [
            'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:99999;',
            'background:' + (type === 'error' ? 'rgba(255,59,48,0.9)' : 'rgba(0,0,0,0.8)') + ';',
            'color:#fff;padding:12px 22px;border-radius:10px;font-size:14px;',
            'font-weight:600;text-align:center;max-width:260px;',
            'pointer-events:none;animation:rpToastIn 0.25s ease-out;',
            'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;'
        ].join('');
        document.body.appendChild(t);

        setTimeout(function () {
            t.style.opacity = '0';
            t.style.transition = 'opacity 0.3s';
            setTimeout(function () {
                if (t.parentNode) t.parentNode.removeChild(t);
            }, 300);
        }, 2000);

        // 注入一次 toast 动画
        if (!document.getElementById('rp-toast-style')) {
            var s = document.createElement('style');
            s.id = 'rp-toast-style';
            s.textContent = '@keyframes rpToastIn{0%{opacity:0;transform:translate(-50%,-50%) scale(0.8)}100%{opacity:1;transform:translate(-50%,-50%) scale(1)}}';
            document.head.appendChild(s);
        }
    }

    /* ============================================================
     * 浮动入口 UI
     * ============================================================ */

    function injectEntryStyles() {
        if (document.getElementById('rp-sdk-styles')) return;
        var s = document.createElement('style');
        s.id = 'rp-sdk-styles';
        s.textContent = [
            '.rpsdk-entry {',
            '  position:fixed;z-index:99980;cursor:pointer;',
            '  display:flex;flex-direction:column;align-items:center;',
            '  -webkit-tap-highlight-color:transparent;',
            '  animation:rpsdkBounceIn 0.5s ease-out;',
            '}',
            '@keyframes rpsdkBounceIn {',
            '  0%{transform:scale(0);opacity:0}',
            '  60%{transform:scale(1.15)}',
            '  100%{transform:scale(1);opacity:1}',
            '}',
            '.rpsdk-icon {',
            '  width:56px;height:56px;border-radius:50%;',
            '  background:linear-gradient(135deg,#FF2D2D,#CC0000);',
            '  box-shadow:0 4px 20px rgba(255,45,45,0.45);',
            '  display:flex;align-items:center;justify-content:center;',
            '  font-size:30px;position:relative;',
            '  transition:transform 0.2s;',
            '}',
            '.rpsdk-icon:active { transform:scale(0.9); }',
            '.rpsdk-icon.open {',
            '  animation:rpsdkPulse 0.8s ease-in-out infinite;',
            '}',
            '@keyframes rpsdkPulse {',
            '  0%,100%{box-shadow:0 4px 20px rgba(255,45,45,0.45)}',
            '  50%{box-shadow:0 4px 36px rgba(255,215,0,0.7),0 0 60px rgba(255,45,45,0.3)}',
            '}',
            '.rpsdk-countdown-badge {',
            '  margin-top:6px;padding:4px 10px;',
            '  background:rgba(0,0,0,0.75);color:#FFD700;',
            '  border-radius:10px;font-size:11px;font-weight:700;',
            '  white-space:nowrap;letter-spacing:0.5px;',
            '  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;',
            '  animation:rpsdkFadeUp 0.4s ease-out;',
            '}',
            '@keyframes rpsdkFadeUp {',
            '  0%{opacity:0;transform:translateY(8px)}',
            '  100%{opacity:1;transform:translateY(0)}',
            '}',
            '.rpsdk-countdown-badge.urgent {',
            '  background:#FF2D2D;color:#fff;animation:rpsdkUrgentPulse 0.6s ease-in-out infinite;',
            '}',
            '@keyframes rpsdkUrgentPulse {',
            '  0%,100%{transform:scale(1)}',
            '  50%{transform:scale(1.06)}',
            '}',
            '.rpsdk-countdown-badge.open {',
            '  background:#34C759;color:#fff;',
            '}'
        ].join('\n');
        document.head.appendChild(s);
    }

    function createEntry() {
        // 防止重复创建
        if (_entryEl) return;

        injectEntryStyles();

        // 容器
        var wrap = document.createElement('div');
        wrap.className = 'rpsdk-entry';
        wrap.id = 'rpsdkEntry';
        wrap.style.bottom = _cfg.posBottom + 'px';
        wrap.style.right = _cfg.posRight + 'px';

        // 礼包图标
        var icon = document.createElement('div');
        icon.className = 'rpsdk-icon';
        icon.id = 'rpsdkIcon';
        icon.textContent = '🎁';

        // 倒计时标签
        var badge = document.createElement('div');
        badge.className = 'rpsdk-countdown-badge';
        badge.id = 'rpsdkCountdown';

        wrap.appendChild(icon);
        wrap.appendChild(badge);
        document.body.appendChild(wrap);

        _entryEl = wrap;
        _countdownEl = badge;

        // 点击
        wrap.addEventListener('click', function (e) {
            e.stopPropagation();
            onEntryClick();
        });
        wrap.addEventListener('touchend', function (e) {
            e.preventDefault();
            e.stopPropagation();
            onEntryClick();
        });
    }

    function updateEntryUI() {
        if (!_entryEl) return;

        var icon = document.getElementById('rpsdkIcon');
        var badge = document.getElementById('rpsdkCountdown');
        if (!icon || !badge) return;

        if (_isOpen) {
            // 开放中
            icon.className = 'rpsdk-icon open';
            badge.textContent = 'OPEN';
            badge.className = 'rpsdk-countdown-badge open';
        } else {
            icon.className = 'rpsdk-icon';
            var msToNext = _openStart ? (_openStart - Date.now()) : 0;
            if (msToNext < 0) msToNext = 0;
            badge.textContent = formatShortCountdown(msToNext);

            // 少于 5 分钟标红
            if (msToNext < 5 * 60 * 1000 && msToNext > 0) {
                badge.className = 'rpsdk-countdown-badge urgent';
            } else {
                badge.className = 'rpsdk-countdown-badge';
            }
        }
    }

    function onEntryClick() {
        if (_rainRunning) return;

        if (_isOpen) {
            // 在开放窗口内 → 进入游戏
            startRainGame();
        } else {
            // 未到时间 → 提示剩余时间
            var msToNext = _openStart ? (_openStart - Date.now()) : 0;
            if (msToNext < 0) msToNext = 0;
            showToast('🧧 Opens in ' + formatCountdown(msToNext));
        }
    }

    /* ============================================================
     * 倒计时更新循环
     * ============================================================ */

    function startCountdownLoop() {
        if (_countdownTimer) clearInterval(_countdownTimer);

        function tick() {
            var result = checkOpenWindow(_cfg.schedule, _cfg.windowDuration);

            if (result.open) {
                _isOpen = true;
                _openStart = result.start;
                _openEnd = result.end;
            } else {
                _isOpen = false;
                _openStart = findNextOpening(_cfg.schedule, _cfg.windowDuration);
                _openEnd = _openStart ? (_openStart + _cfg.windowDuration * 60 * 1000) : null;
            }

            updateEntryUI();
        }

        tick(); // 立即执行一次
        _countdownTimer = setInterval(tick, 1000);
    }

    /* ============================================================
     * 红包雨游戏（内嵌）
     * ============================================================ */

    function injectRainStyles() {
        if (document.getElementById('rp-rain-styles')) return;
        var s = document.createElement('style');
        s.id = 'rp-rain-styles';
        s.textContent = [
            '.rp-overlay{position:fixed;top:0;left:0;width:100%;height:100%;',
            'background:rgba(0,0,0,0.65);z-index:99990;overflow:hidden;',
            '-webkit-tap-highlight-color:transparent;',
            'display:flex;flex-direction:column;align-items:center}',
            '.rp-header{width:100%;padding:12px 20px;display:flex;',
            'justify-content:space-between;align-items:center;',
            'color:#FFD700;font-size:16px;font-weight:700;',
            'text-shadow:0 1px 4px rgba(0,0,0,0.5);z-index:1}',
            '.rp-close-btn{width:32px;height:32px;border-radius:50%;',
            'border:2px solid rgba(255,255,255,0.6);background:rgba(0,0,0,0.3);',
            'color:#fff;font-size:18px;cursor:pointer;',
            'display:flex;align-items:center;justify-content:center}',
            '.rp-countdown{background:rgba(0,0,0,0.4);padding:4px 14px;',
            'border-radius:14px;font-size:14px;transition:color 0.3s}',
            '.rp-stage{position:absolute;top:0;left:0;width:100%;height:100%}',
            '.rp-packet{position:absolute;top:-80px;cursor:pointer;',
            'display:flex;align-items:center;justify-content:center;',
            'font-size:32px;line-height:1;-webkit-tap-highlight-color:transparent;',
            'user-select:none;-webkit-user-select:none;z-index:1}',
            '.rp-packet.burst{animation:rpBurst 0.45s ease-out forwards;pointer-events:none}',
            '@keyframes rpBurst{0%{transform:scale(1);opacity:1}',
            '40%{transform:scale(1.8);opacity:0.9}100%{transform:scale(3);opacity:0}}',
            '.rp-particle{position:absolute;width:6px;height:6px;border-radius:50%;',
            'pointer-events:none;z-index:3;animation:rpParticleFly 0.6s ease-out forwards}',
            '@keyframes rpParticleFly{0%{transform:translate(0,0) scale(1);opacity:1}',
            '100%{transform:translate(var(--dx),var(--dy)) scale(0);opacity:0}}',
            '.rp-hit-text{position:absolute;font-size:28px;font-weight:900;color:#FFD700;',
            'text-shadow:0 0 12px rgba(255,215,0,0.9),0 2px 6px rgba(0,0,0,0.5);',
            'pointer-events:none;z-index:2;white-space:nowrap;',
            'animation:rpHitFloat 1s ease-out forwards}',
            '@keyframes rpHitFloat{0%{transform:translateY(0) scale(0.4);opacity:1}',
            '30%{transform:translateY(-30px) scale(1.3);opacity:1}',
            '100%{transform:translateY(-80px) scale(0.7);opacity:0}}',
            '.rp-summary{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);',
            'background:linear-gradient(180deg,#FF2D2D,#CC0000);color:#FFD700;',
            'border-radius:20px;padding:30px 24px;text-align:center;z-index:10;',
            'box-shadow:0 8px 40px rgba(255,0,0,0.4);min-width:260px}',
            '.rp-summary-icon{font-size:56px;margin-bottom:8px}',
            '.rp-summary-title{font-size:20px;font-weight:800;margin-bottom:4px}',
            '.rp-summary-pts{font-size:36px;font-weight:900;margin:8px 0}',
            '.rp-summary-sub{font-size:13px;color:#FFE0B2;margin-bottom:16px}',
            '.rp-summary-btn{display:block;width:100%;padding:12px;border:none;',
            'border-radius:24px;background:#FFD700;color:#CC0000;',
            'font-size:16px;font-weight:800;cursor:pointer}',
            '.rp-summary-btn:active{opacity:0.8}'
        ].join('\n');
        document.head.appendChild(s);
    }

    function createRainOverlay() {
        var overlay = document.createElement('div');
        overlay.className = 'rp-overlay';

        var header = document.createElement('div');
        header.className = 'rp-header';
        header.innerHTML = '<span>🧧 Red Packet Rain</span>'
            + '<span class="rp-countdown" id="rpCountdown"></span>'
            + '<button class="rp-close-btn" id="rpCloseBtn">&times;</button>';
        overlay.appendChild(header);

        var stage = document.createElement('div');
        stage.className = 'rp-stage';
        stage.id = 'rpStage';
        overlay.appendChild(stage);

        document.body.appendChild(overlay);
        _rainOverlay = overlay;

        document.getElementById('rpCloseBtn').addEventListener('click', function () {
            endRain();
        });
    }

    function removeRainOverlay() {
        if (_rainOverlay && _rainOverlay.parentNode) {
            _rainOverlay.parentNode.removeChild(_rainOverlay);
        }
        _rainOverlay = null;
    }

    function updateRainCountdown() {
        var el = document.getElementById('rpCountdown');
        if (!el) return;
        var remain = _cfg.maxClaimCount - _rainClaimed;
        if (remain <= 0) {
            el.textContent = 'All claimed!';
            el.style.color = '#FFD700';
        } else {
            el.textContent = '🎁 x' + remain;
            if (remain <= 2) el.style.color = '#FFD700';
        }
    }

    function spawnParticles(x, y) {
        var stage = document.getElementById('rpStage');
        if (!stage) return;
        var colors = ['#FFD700', '#FF6B00', '#FF2D2D', '#FFE082', '#FFF176'];
        for (var i = 0; i < 8; i++) {
            var p = document.createElement('div');
            p.className = 'rp-particle';
            p.style.left = x + 'px';
            p.style.top = y + 'px';
            p.style.background = colors[i % colors.length];
            var angle = (Math.PI * 2 * i) / 8 + (Math.random() - 0.5) * 0.5;
            var dist = 30 + Math.random() * 40;
            p.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
            p.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
            stage.appendChild(p);
            setTimeout(function () { if (p.parentNode) p.parentNode.removeChild(p); }, 650);
        }
    }

    function showHitText(x, y, text) {
        var stage = document.getElementById('rpStage');
        if (!stage) return;
        var el = document.createElement('div');
        el.className = 'rp-hit-text';
        el.textContent = text;
        el.style.left = (x - 20) + 'px';
        el.style.top = (y - 10) + 'px';
        stage.appendChild(el);
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 1050);
    }

    function spawnRainPacket() {
        var stage = document.getElementById('rpStage');
        if (!stage) return;

        var size = 52 + Math.floor(Math.random() * 20);
        var el = document.createElement('div');
        el.className = 'rp-packet';
        el.style.width = size + 'px';
        el.style.height = size + 'px';
        el.style.fontSize = Math.floor(size * 0.6) + 'px';
        el.style.lineHeight = size + 'px';
        el.textContent = '🧧';
        el.style.top = '-80px';
        el.style.left = (10 + Math.random() * (window.innerWidth - size - 20)) + 'px';

        el.addEventListener('click', function (e) { e.stopPropagation(); onRainPacketClick(el); });
        el.addEventListener('touchend', function (e) { e.preventDefault(); e.stopPropagation(); onRainPacketClick(el); });

        stage.appendChild(el);

        _rainPackets.push({
            el: el,
            startTime: Date.now(),
            duration: _cfg.fallDurationMin + Math.random() * (_cfg.fallDurationMax - _cfg.fallDurationMin),
            swingAmp: 10 + Math.random() * 35,
            swingPhase: Math.random() * Math.PI * 2,
            removed: false
        });
    }

    function onRainPacketClick(el) {
        if (!_rainRunning) return;
        if (el.classList.contains('burst')) return;
        if (_rainClaimed >= _cfg.maxClaimCount) return;

        el.classList.add('burst');
        var rect = el.getBoundingClientRect();
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height / 2;

        spawnParticles(cx, cy);
        showHitText(cx, cy - 10, '+1');

        _rainClaimed++;
        updateRainCountdown();

        for (var i = 0; i < _rainPackets.length; i++) {
            if (_rainPackets[i].el === el) { _rainPackets[i].removed = true; break; }
        }
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 500);

        // 异步领取
        claimReward(function (err, points) {
            if (!err) _rainPoints += points;
        });
    }

    function rainAnimationLoop() {
        if (!_rainRunning) return;
        var now = Date.now();
        var stageH = window.innerHeight;

        for (var i = _rainPackets.length - 1; i >= 0; i--) {
            var pkt = _rainPackets[i];
            var elapsed = now - pkt.startTime;
            var progress = elapsed / pkt.duration;

            if (progress >= 1 || pkt.removed) {
                if (pkt.el.parentNode) pkt.el.parentNode.removeChild(pkt.el);
                _rainPackets.splice(i, 1);
                continue;
            }

            pkt.el.style.top = (-80 + progress * (stageH + 120)) + 'px';
            var swing = Math.sin(progress * Math.PI * 3 + pkt.swingPhase) * pkt.swingAmp;
            pkt.el.style.transform = 'translateX(' + swing + 'px) rotate(' + (progress * 360) + 'deg)';
            if (progress > 0.7) pkt.el.style.opacity = 1 - (progress - 0.7) / 0.3;
        }

        _rainRafId = requestAnimationFrame(rainAnimationLoop);
    }

    function startRainGame() {
        if (_rainRunning) return;
        _rainRunning = true;
        _rainClaimed = 0;
        _rainPoints = 0;
        _rainPackets = [];

        injectRainStyles();
        createRainOverlay();
        updateRainCountdown();

        _rainRafId = requestAnimationFrame(rainAnimationLoop);

        // 开始生成红包
        spawnRainPacket();
        _rainSpawnId = setInterval(function () {
            if (!_rainRunning || _rainClaimed >= _cfg.maxClaimCount) return;
            spawnRainPacket();
        }, _cfg.spawnInterval);

        // 自动结束
        var t = setTimeout(function () { endRain(); }, _cfg.rainDuration);
        _rainTimers.push(t);
    }

    function endRain() {
        _rainRunning = false;
        if (_rainSpawnId) { clearInterval(_rainSpawnId); _rainSpawnId = null; }
        if (_rainRafId) { cancelAnimationFrame(_rainRafId); _rainRafId = null; }

        for (var i = 0; i < _rainTimers.length; i++) clearTimeout(_rainTimers[i]);
        _rainTimers = [];

        for (var j = 0; j < _rainPackets.length; j++) {
            if (_rainPackets[j].el && _rainPackets[j].el.parentNode) {
                _rainPackets[j].el.parentNode.removeChild(_rainPackets[j].el);
            }
        }
        _rainPackets = [];

        setTimeout(function () {
            if (_rainClaimed > 0) {
                showSummary();
            } else {
                removeRainOverlay();
                // 触发关闭回调
                if (_cfg.onClose) _cfg.onClose({ claimed: 0, points: 0 });
            }
        }, 400);

        // 游戏结束后重算开放状态
        var result = checkOpenWindow(_cfg.schedule, _cfg.windowDuration);
        if (!result.open) {
            _isOpen = false;
            _openStart = findNextOpening(_cfg.schedule, _cfg.windowDuration);
            updateEntryUI();
        }
    }

    function showSummary() {
        var total = _rainPoints || _rainClaimed;
        var panel = document.createElement('div');
        panel.className = 'rp-summary';
        panel.innerHTML = '<div class="rp-summary-icon">🧧</div>'
            + '<div class="rp-summary-title">Rain Over!</div>'
            + '<div class="rp-summary-pts">+' + total + ' pts</div>'
            + '<div class="rp-summary-sub">Grabbed ' + _rainClaimed + ' packet'
            + (_rainClaimed !== 1 ? 's' : '') + '</div>'
            + '<button class="rp-summary-btn" id="rpSummaryBtn">Nice!</button>';
        _rainOverlay.appendChild(panel);

        document.getElementById('rpSummaryBtn').addEventListener('click', function () {
            if (panel.parentNode) panel.parentNode.removeChild(panel);
            removeRainOverlay();
            if (_cfg.onClose) _cfg.onClose({ claimed: _rainClaimed, points: total });
        });
    }

    /* ============================================================
     * API 调用
     * ============================================================ */

    function apiGet(url, cb) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.timeout = 10000;
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    try { cb(null, JSON.parse(xhr.responseText)); }
                    catch (e) { cb(new Error('JSON parse error')); }
                } else {
                    cb(new Error('HTTP ' + xhr.status));
                }
            }
        };
        xhr.onerror = function () { cb(new Error('Network error')); };
        xhr.ontimeout = function () { cb(new Error('Timeout')); };
        xhr.send();
    }

    function fetchServerConfig(callback) {
        var ts = Math.floor(Date.now() / 1000).toString();
        var raw = _cfg.cId + _cfg.userId + ts + _cfg.secretKey;
        var sign = CryptoJS.MD5(raw).toString();

        var url = _cfg.apiBase + '/redpacket/config?c_id=' + encodeURIComponent(_cfg.cId)
            + '&user_id=' + encodeURIComponent(_cfg.userId)
            + '&ts=' + ts + '&sign=' + sign;

        apiGet(url, function (err, resp) {
            if (err || !resp || resp.code !== 0) {
                _demoMode = true;
                callback(null, null); // 服务端不可用
                return;
            }
            _demoMode = false;
            callback(null, resp.data || resp);
        });
    }

    function claimReward(callback) {
        if (_demoMode) {
            var rewards = [1, 2, 3, 5, 8, 10, 15, 20, 30, 50];
            setTimeout(function () {
                callback(null, rewards[Math.floor(Math.random() * rewards.length)]);
            }, 80 + Math.random() * 170);
            return;
        }

        var ts = Math.floor(Date.now() / 1000).toString();
        var raw = _cfg.cId + _cfg.userId + ts + _cfg.secretKey;
        var sign = CryptoJS.MD5(raw).toString();

        var url = _cfg.apiBase + '/redpacket/claim?c_id=' + encodeURIComponent(_cfg.cId)
            + '&user_id=' + encodeURIComponent(_cfg.userId)
            + '&ts=' + ts + '&sign=' + sign;

        apiGet(url, function (err, resp) {
            if (err) { callback(err); return; }
            if (resp && resp.code === 0) {
                var pts = (resp.data && resp.data.points) || 1;
                callback(null, pts);
            } else {
                callback(new Error(resp.msg || 'claim failed'));
            }
        });
    }

    /* ============================================================
     * 公开接口
     * ============================================================ */

    /**
     * 初始化 SDK。
     *
     * @param {Object} opts
     *   cId, userId, secretKey, apiBase  — API 参数
     *   schedule       — 开放时段数组，如 ['09:00', '12:00', '18:00']
     *   windowDuration — 每时段开放多少分钟（默认 10）
     *   rainDuration   — 红包雨持续时间 ms（默认 10000）
     *   maxClaimCount  — 每次最多抢红包数（默认 10）
     *   posBottom      — 入口距底部 px（默认 100）
     *   posRight       — 入口距右侧 px（默认 16）
     *   onClose        — 红包雨结束回调 function({claimed, points})
     */
    var _initialized = false;

    function init(opts) {
        // 防止重复初始化
        if (_initialized) {
            console.log('[RedPacketSDK] already initialized, skipping');
            return;
        }
        _initialized = true;

        opts = opts || {};

        // 合并配置
        _cfg.cId = opts.cId || 'test2';
        _cfg.userId = opts.userId || 'demo_user_002';
        _cfg.secretKey = opts.secretKey || '00fd3c92cecb228f39743ad7a6584062';
        _cfg.apiBase = opts.apiBase || 'https://api.zombifieds.com/api/v2';
        _cfg.env = opts.env || 'test2';
        _cfg.schedule = opts.schedule || DEFAULTS.schedule;
        _cfg.windowDuration = opts.windowDuration || DEFAULTS.windowDuration;
        _cfg.rainDuration = opts.rainDuration || DEFAULTS.rainDuration;
        _cfg.spawnInterval = opts.spawnInterval || DEFAULTS.spawnInterval;
        _cfg.fallDurationMin = opts.fallDurationMin || DEFAULTS.fallDurationMin;
        _cfg.fallDurationMax = opts.fallDurationMax || DEFAULTS.fallDurationMax;
        _cfg.maxClaimCount = opts.maxClaimCount || DEFAULTS.maxClaimCount;
        _cfg.posBottom = (opts.posBottom !== undefined) ? opts.posBottom : DEFAULTS.posBottom;
        _cfg.posRight = (opts.posRight !== undefined) ? opts.posRight : DEFAULTS.posRight;
        _cfg.onClose = opts.onClose || null;

        // 尝试从服务端获取配置
        fetchServerConfig(function (err, serverCfg) {
            if (serverCfg) {
                if (serverCfg.schedule && serverCfg.schedule.length) {
                    _cfg.schedule = serverCfg.schedule;
                }
                if (serverCfg.window_duration) {
                    _cfg.windowDuration = serverCfg.window_duration;
                }
                if (serverCfg.max_claim) {
                    _cfg.maxClaimCount = serverCfg.max_claim;
                }
            }

            // 创建入口 UI
            createEntry();

            // 启动倒计时
            startCountdownLoop();

            console.log('[RedPacketSDK] init done (demo=' + _demoMode + ', schedule=' + _cfg.schedule.join(',') + ')');
        });
    }

    /** 显示入口 */
    function show() {
        if (_entryEl) _entryEl.style.display = 'flex';
    }

    /** 隐藏入口 */
    function hide() {
        if (_entryEl) _entryEl.style.display = 'none';
    }

    /** 销毁 SDK */
    function destroy() {
        if (_countdownTimer) clearInterval(_countdownTimer);
        if (_entryEl && _entryEl.parentNode) _entryEl.parentNode.removeChild(_entryEl);
        _entryEl = null;
        _countdownEl = null;
        endRain();
    }

    /** 手动刷新状态 */
    function refresh() {
        var result = checkOpenWindow(_cfg.schedule, _cfg.windowDuration);
        _isOpen = result.open;
        _openStart = result.open ? result.start : findNextOpening(_cfg.schedule, _cfg.windowDuration);
        _openEnd = result.open ? result.end : null;
        updateEntryUI();
    }

    return {
        init: init,
        show: show,
        hide: hide,
        destroy: destroy,
        refresh: refresh,
        get isOpen() { return _isOpen; },
        get isRunning() { return _rainRunning; }
    };
})();
