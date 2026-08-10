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
        fallDurationMin: 2800,  // 单个红包最短掉落时间（毫秒）
        fallDurationMax: 4500,  // 单个红包最长掉落时间（毫秒）
        packetSizeMin: 52,      // 红包最小尺寸（px）
        packetSizeMax: 72,      // 红包最大尺寸（px）
        swingRange: 40          // 左右摆动幅度（px）
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
        rafId: null,            // requestAnimationFrame ID
        packets: [],            // 活跃的红包数据 [{el, left, speed, swingAmp, swingPhase, startTime}]
        demoMode: true          // 默认模拟模式（后端就绪后由 fetchStatus 切换）
    };

    /* ============================================================
     * 模拟数据
     * ============================================================ */

    var DEMO_REWARDS = [1, 2, 3, 5, 8, 10, 15, 20, 30, 50];

    function randomDemoReward() {
        return DEMO_REWARDS[Math.floor(Math.random() * DEMO_REWARDS.length)];
    }

    /* ============================================================
     * DOM 工具
     * ============================================================ */

    /** 注入样式（仅一次） */
    function injectStyles() {
        if (document.getElementById('redpacket-rain-styles')) return;

        var style = document.createElement('style');
        style.id = 'redpacket-rain-styles';
        style.textContent = [
            '.rp-overlay {',
            '  position:fixed;top:0;left:0;width:100%;height:100%;',
            '  background:rgba(0,0,0,0.65);z-index:99990;overflow:hidden;',
            '  -webkit-tap-highlight-color:transparent;',
            '  display:flex;flex-direction:column;align-items:center;',
            '}',
            '.rp-header {',
            '  width:100%;padding:12px 20px;display:flex;',
            '  justify-content:space-between;align-items:center;',
            '  color:#FFD700;font-size:16px;font-weight:700;',
            '  text-shadow:0 1px 4px rgba(0,0,0,0.5);z-index:1;',
            '}',
            '.rp-close-btn {',
            '  width:32px;height:32px;border-radius:50%;',
            '  border:2px solid rgba(255,255,255,0.6);',
            '  background:rgba(0,0,0,0.3);color:#fff;font-size:18px;',
            '  cursor:pointer;display:flex;align-items:center;justify-content:center;',
            '}',
            '.rp-countdown {',
            '  background:rgba(0,0,0,0.4);padding:4px 14px;',
            '  border-radius:14px;font-size:14px;',
            '  transition: color 0.3s;',
            '}',
            '.rp-stage {',
            '  position:absolute;top:0;left:0;width:100%;height:100%;',
            '}',
            /* 红包 — 用 top 做竖直位置，确保点击热区跟随 */
            '.rp-packet {',
            '  position:absolute;top:-80px;',
            '  cursor:pointer;display:flex;align-items:center;justify-content:center;',
            '  font-size:32px;line-height:1;',
            '  -webkit-tap-highlight-color:transparent;',
            '  user-select:none;-webkit-user-select:none;',
            '  z-index:1;transition: none;',
            '}',
            /* 爆开动画 */
            '.rp-packet.burst {',
            '  animation:rpBurst 0.45s ease-out forwards;',
            '  pointer-events:none;',
            '}',
            '@keyframes rpBurst {',
            '  0%   { transform:scale(1); opacity:1; }',
            '  40%  { transform:scale(1.8); opacity:0.9; }',
            '  100% { transform:scale(3); opacity:0; }',
            '}',
            /* 命中粒子 */
            '.rp-particle {',
            '  position:absolute;width:6px;height:6px;border-radius:50%;',
            '  pointer-events:none;z-index:3;',
            '  animation:rpParticleFly 0.6s ease-out forwards;',
            '}',
            '@keyframes rpParticleFly {',
            '  0%   { transform:translate(0,0) scale(1); opacity:1; }',
            '  100% { transform:translate(var(--dx),var(--dy)) scale(0); opacity:0; }',
            '}',
            /* +1 浮动文字 */
            '.rp-hit-text {',
            '  position:absolute;',
            '  font-size:28px;font-weight:900;color:#FFD700;',
            '  text-shadow:0 0 12px rgba(255,215,0,0.9),0 2px 6px rgba(0,0,0,0.5);',
            '  pointer-events:none;z-index:2;white-space:nowrap;',
            '  animation:rpHitFloat 1s ease-out forwards;',
            '}',
            '@keyframes rpHitFloat {',
            '  0%   { transform:translateY(0) scale(0.4); opacity:1; }',
            '  30%  { transform:translateY(-30px) scale(1.3); opacity:1; }',
            '  100% { transform:translateY(-80px) scale(0.7); opacity:0; }',
            '}',
            /* 汇总面板 */
            '.rp-summary {',
            '  position:absolute;top:50%;left:50%;',
            '  transform:translate(-50%,-50%);',
            '  background:linear-gradient(180deg,#FF2D2D,#CC0000);',
            '  color:#FFD700;border-radius:20px;padding:30px 24px;',
            '  text-align:center;z-index:10;',
            '  box-shadow:0 8px 40px rgba(255,0,0,0.4);',
            '  min-width:260px;',
            '}',
            '.rp-summary-icon { font-size:56px;margin-bottom:8px; }',
            '.rp-summary-title { font-size:20px;font-weight:800;margin-bottom:4px; }',
            '.rp-summary-pts { font-size:36px;font-weight:900;margin:8px 0; }',
            '.rp-summary-sub { font-size:13px;color:#FFE0B2;margin-bottom:16px; }',
            '.rp-summary-btn {',
            '  display:block;width:100%;padding:12px;border:none;',
            '  border-radius:24px;background:#FFD700;color:#CC0000;',
            '  font-size:16px;font-weight:800;cursor:pointer;',
            '}',
            '.rp-summary-btn:active { opacity:0.8; }',
            /* 入口横幅 */
            '.rp-entry-banner {',
            '  margin:0 16px 16px;padding:14px 16px;',
            '  background:linear-gradient(135deg,#FF2D2D,#FF6B00);',
            '  border-radius:14px;display:flex;align-items:center;',
            '  justify-content:space-between;cursor:pointer;',
            '  box-shadow:0 3px 12px rgba(255,45,45,0.35);',
            '  position:relative;overflow:hidden;',
            '  -webkit-tap-highlight-color:transparent;',
            '  animation:rpBannerPulse 2s ease-in-out infinite;',
            '}',
            '@keyframes rpBannerPulse {',
            '  0%,100%{box-shadow:0 3px 12px rgba(255,45,45,0.35)}',
            '  50%{box-shadow:0 3px 24px rgba(255,45,45,0.6)}',
            '}',
            '.rp-entry-banner:active{transform:scale(0.98);opacity:0.9}',
            '.rp-entry-banner::before {',
            '  content:"";position:absolute;top:-50%;left:-50%;',
            '  width:200%;height:200%;',
            '  background:radial-gradient(circle,rgba(255,255,255,0.15) 0%,transparent 60%);',
            '  animation:rpBannerShine 3s linear infinite;',
            '}',
            '@keyframes rpBannerShine {',
            '  0%{transform:translate(-30%,-30%)}',
            '  100%{transform:translate(30%,30%)}',
            '}',
            '.rp-entry-icon{font-size:32px;z-index:1}',
            '.rp-entry-info{z-index:1;flex:1;margin-left:12px}',
            '.rp-entry-title{font-size:16px;font-weight:800;color:#fff}',
            '.rp-entry-sub{font-size:11px;color:#FFE0B2;margin-top:2px}',
            '.rp-entry-arrow{',
            '  z-index:1;background:rgba(255,255,255,0.25);',
            '  padding:6px 14px;border-radius:16px;',
            '  color:#fff;font-size:13px;font-weight:700;',
            '}'
        ].join('\n');
        document.head.appendChild(style);
    }

    /** 创建覆盖层 */
    function createOverlay() {
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
        _state.overlay = overlay;

        document.getElementById('rpCloseBtn').addEventListener('click', function () {
            endRain();
        });
    }

    function removeOverlay() {
        if (_state.overlay && _state.overlay.parentNode) {
            _state.overlay.parentNode.removeChild(_state.overlay);
        }
        _state.overlay = null;
    }

    /* ============================================================
     * 命中特效
     * ============================================================ */

    /** 在点击位置生成粒子爆开效果 */
    function spawnParticles(x, y) {
        var stage = document.getElementById('rpStage');
        if (!stage) return;

        var colors = ['#FFD700', '#FF6B00', '#FF2D2D', '#FFE082', '#FFF176'];
        var count = 8;

        for (var i = 0; i < count; i++) {
            var p = document.createElement('div');
            p.className = 'rp-particle';
            p.style.left = x + 'px';
            p.style.top = y + 'px';
            p.style.background = colors[i % colors.length];

            // 随机飞散方向
            var angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
            var dist = 30 + Math.random() * 40;
            p.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
            p.style.setProperty('--dy', Math.sin(angle) * dist + 'px');

            stage.appendChild(p);

            // 动画结束后移除
            setTimeout(function () {
                if (p.parentNode) p.parentNode.removeChild(p);
            }, 650);
        }
    }

    /** 在点击位置显示 +1（或其他文字） */
    function showHitText(x, y, text) {
        var stage = document.getElementById('rpStage');
        if (!stage) return;

        var el = document.createElement('div');
        el.className = 'rp-hit-text';
        el.textContent = text;
        el.style.left = (x - 20) + 'px';
        el.style.top = (y - 10) + 'px';
        stage.appendChild(el);

        setTimeout(function () {
            if (el.parentNode) el.parentNode.removeChild(el);
        }, 1050);
    }

    /* ============================================================
     * 动画循环 — 用 requestAnimationFrame + top 属性驱动
     *（不用 CSS transform，确保点击热区跟随视觉位置）
     * ============================================================ */

    function animationLoop() {
        if (!_state.running) return;

        var now = Date.now();
        var packets = _state.packets;
        var stageEl = document.getElementById('rpStage');
        var stageH = window.innerHeight;

        for (var i = packets.length - 1; i >= 0; i--) {
            var pkt = packets[i];
            var elapsed = now - pkt.startTime;
            var progress = elapsed / pkt.duration;

            if (progress >= 1 || pkt.removed) {
                // 掉落结束 — 移除
                if (pkt.el.parentNode) pkt.el.parentNode.removeChild(pkt.el);
                packets.splice(i, 1);
                continue;
            }

            // 竖直位置：用 top（不是 transform！），确保可点击
            var topVal = -80 + progress * (stageH + 120);
            pkt.el.style.top = topVal + 'px';

            // 水平摆动
            var swing = Math.sin(progress * Math.PI * 3 + pkt.swingPhase) * pkt.swingAmp;
            pkt.el.style.transform = 'translateX(' + swing + 'px) rotate(' + (progress * 360) + 'deg)';

            // 底部渐隐
            if (progress > 0.7) {
                pkt.el.style.opacity = 1 - (progress - 0.7) / 0.3;
            }
        }

        _state.rafId = requestAnimationFrame(animationLoop);
    }

    /* ============================================================
     * 创建红包
     * ============================================================ */

    function spawnPacket() {
        if (!_state.running) return;

        var stage = document.getElementById('rpStage');
        if (!stage) return;

        var el = document.createElement('div');
        el.className = 'rp-packet';

        // 随机尺寸
        var size = DEFAULTS.packetSizeMin
            + Math.floor(Math.random() * (DEFAULTS.packetSizeMax - DEFAULTS.packetSizeMin));
        el.style.width = size + 'px';
        el.style.height = size + 'px';
        el.style.fontSize = Math.floor(size * 0.6) + 'px';
        el.style.lineHeight = size + 'px';
        el.textContent = '🧧';

        // 初始位置
        el.style.top = '-80px';
        var left = 10 + Math.random() * (window.innerWidth - size - 20);
        el.style.left = left + 'px';

        // 点击事件
        el.addEventListener('click', function (e) {
            e.stopPropagation();
            onPacketClick(el);
        });

        // 触摸事件（移动端兼容）
        el.addEventListener('touchend', function (e) {
            e.preventDefault();
            e.stopPropagation();
            onPacketClick(el);
        });

        stage.appendChild(el);

        // 记录 animation 数据
        _state.packets.push({
            el: el,
            left: left,
            startTime: Date.now(),
            duration: DEFAULTS.fallDurationMin
                + Math.random() * (DEFAULTS.fallDurationMax - DEFAULTS.fallDurationMin),
            swingAmp: 10 + Math.random() * DEFAULTS.swingRange,
            swingPhase: Math.random() * Math.PI * 2,
            removed: false
        });
    }

    /* ============================================================
     * 红包点击处理 — 即时反馈，API 异步
     * ============================================================ */

    function onPacketClick(el) {
        if (!_state.running) return;
        if (el.classList.contains('burst')) return;
        if (_state.claimed >= _state.maxClaimCount) return;

        // 标记已点击
        el.classList.add('burst');

        // 获取点击位置
        var rect = el.getBoundingClientRect();
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height / 2;

        // ★ 即时视觉反馈
        spawnParticles(cx, cy);
        showHitText(cx, cy - 10, '+1');

        // ★ 立即计数
        _state.claimed++;
        updateCountdownDisplay();

        // 从 active 列表标记移除
        for (var i = 0; i < _state.packets.length; i++) {
            if (_state.packets[i].el === el) {
                _state.packets[i].removed = true;
                break;
            }
        }

        // DOM 在 burst 动画结束后移除
        setTimeout(function () {
            if (el.parentNode) el.parentNode.removeChild(el);
        }, 500);

        // API 调用异步进行（不阻塞视觉反馈）
        claimOne(function (err, points) {
            if (err) {
                console.log('[redpacket] claim API error: ' + err.message);
                return;
            }
            _state.totalPoints += points;
            console.log('[redpacket] +' + points + ' pts (total=' + _state.totalPoints + ', claimed=' + _state.claimed + ')');
        });
    }

    /* ============================================================
     * 倒计时显示
     * ============================================================ */

    function updateCountdownDisplay() {
        var el = document.getElementById('rpCountdown');
        if (!el) return;
        var remain = _state.maxClaimCount - _state.claimed;
        if (remain <= 0) {
            el.textContent = 'All claimed!';
            el.style.color = '#FFD700';
        } else {
            el.textContent = '🎁 x' + remain;
            if (remain <= 2) {
                el.style.color = '#FFD700';
            }
        }
    }

    /* ============================================================
     * 红包生成定时器
     * ============================================================ */

    var _spawnIntervalId = null;

    function startSpawning() {
        spawnPacket(); // 首个立即生成
        _spawnIntervalId = setInterval(function () {
            if (!_state.running) return;
            if (_state.claimed >= _state.maxClaimCount) return;
            spawnPacket();
        }, DEFAULTS.spawnInterval);
    }

    function stopSpawning() {
        if (_spawnIntervalId) {
            clearInterval(_spawnIntervalId);
            _spawnIntervalId = null;
        }
    }

    /* ============================================================
     * 开始 / 结束
     * ============================================================ */

    function beginRain() {
        _state.running = true;
        _state.claimed = 0;
        _state.totalPoints = 0;
        _state.packets = [];

        injectStyles();
        createOverlay();
        updateCountdownDisplay();

        // 启动帧动画
        _state.rafId = requestAnimationFrame(animationLoop);

        // 启动红包生成
        startSpawning();

        // 总时长结束后自动停止
        var endTimer = setTimeout(function () {
            endRain();
        }, DEFAULTS.duration);
        _state.timers = _state.timers || [];
        _state.timers.push(endTimer);

        console.log('[redpacket] rain started (duration=' + DEFAULTS.duration + 'ms, maxClaim=' + _state.maxClaimCount + ')');
    }

    function endRain() {
        _state.running = false;
        stopSpawning();

        // 停止帧动画
        if (_state.rafId) {
            cancelAnimationFrame(_state.rafId);
            _state.rafId = null;
        }

        // 清除所有定时器
        var timers = _state.timers || [];
        for (var i = 0; i < timers.length; i++) {
            clearTimeout(timers[i]);
        }
        _state.timers = [];

        // 清除残留红包
        var packets = _state.packets;
        for (var j = 0; j < packets.length; j++) {
            if (packets[j].el && packets[j].el.parentNode) {
                packets[j].el.parentNode.removeChild(packets[j].el);
            }
        }
        _state.packets = [];

        // 短暂延迟后显示汇总（让最后的 burst 动画播完）
        setTimeout(function () {
            if (_state.claimed > 0) {
                showSummary();
            } else {
                removeOverlay();
            }
        }, 400);
    }

    /** 显示结束汇总 */
    function showSummary() {
        var panel = document.createElement('div');
        panel.className = 'rp-summary';
        panel.id = 'rpSummary';
        panel.innerHTML = '<div class="rp-summary-icon">🧧</div>'
            + '<div class="rp-summary-title">Rain Over!</div>'
            + '<div class="rp-summary-pts">+'
            + (_state.totalPoints || _state.claimed)
            + ' pts</div>'
            + '<div class="rp-summary-sub">You grabbed '
            + _state.claimed + ' red packet'
            + (_state.claimed !== 1 ? 's' : '') + '</div>'
            + '<button class="rp-summary-btn" onclick="RedPacketRain.closeSummary()">Nice!</button>';

        _state.overlay.appendChild(panel);
        _state.summaryPanel = panel;
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

    /* ============================================================
     * API 接口（预留，后端未就绪时使用模拟数据）
     * ============================================================ */

    function fetchStatus(callback) {
        var ts = getTs();
        var sign = buildSign([CONFIG.cId, CONFIG.userId, ts], true);
        var url = CONFIG.apiBase + '/redpacket/status?c_id=' + encodeURIComponent(CONFIG.cId)
            + '&user_id=' + encodeURIComponent(CONFIG.userId)
            + '&ts=' + ts + '&sign=' + sign;

        apiGet(url, function (err, resp) {
            if (err) {
                console.log('[redpacket] fetchStatus failed, demo mode');
                _state.demoMode = true;
                callback(null, { available: true, remain_count: 10 });
                return;
            }
            resp = decryptResponseData(resp, ts);
            if (resp._decrypted && typeof resp._decrypted === 'object') {
                _state.demoMode = false;
                callback(null, resp._decrypted);
            } else if (resp.code === 0) {
                callback(null, resp);
            } else {
                _state.demoMode = true;
                callback(null, { available: true, remain_count: 10 });
            }
        });
    }

    function claimOne(callback) {
        if (_state.demoMode) {
            // 模拟：80-250ms 后返回随机奖励
            setTimeout(function () {
                callback(null, randomDemoReward());
            }, 80 + Math.random() * 170);
            return;
        }

        var ts = getTs();
        var sign = buildSign([CONFIG.cId, CONFIG.userId, ts], true);
        var url = CONFIG.apiBase + '/redpacket/claim?c_id=' + encodeURIComponent(CONFIG.cId)
            + '&user_id=' + encodeURIComponent(CONFIG.userId)
            + '&ts=' + ts + '&sign=' + sign;

        apiGet(url, function (err, resp) {
            if (err) { callback(err); return; }
            resp = decryptResponseData(resp, ts);
            if (resp._decrypted && typeof resp._decrypted === 'object') {
                callback(null, resp._decrypted.points || 1);
            } else if (resp.code === 0) {
                callback(null, (resp.data && resp.data.points) || 1);
            } else {
                callback(new Error(resp.msg || 'claim failed'));
            }
        });
    }

    /* ============================================================
     * 公开接口
     * ============================================================ */

    function start() {
        if (_state.running) return;

        fetchStatus(function (err, data) {
            if (data && data.available) {
                _state.maxClaimCount = data.remain_count || 10;
            } else {
                _state.maxClaimCount = 10;
            }
            beginRain();
        });
    }

    function stop() {
        if (!_state.running) return;
        endRain();
    }

    function destroy() {
        stop();
        removeOverlay();
    }

    function isRunning() {
        return _state.running;
    }

    return {
        start: start,
        stop: stop,
        closeSummary: closeSummary,
        destroy: destroy,
        isRunning: isRunning
    };
})();
