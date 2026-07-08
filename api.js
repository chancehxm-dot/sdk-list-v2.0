/**
 * api.js - Points Center API Layer
 * Configuration, crypto utilities, HTTP helpers, and API functions.
 * Dependencies: CryptoJS (must be loaded before this script)
 */
/* ============================================================
 * Configuration
 * ============================================================ */
var CONFIG = {
    env: 'test2',
    testApi: 'http://192.168.1.153:7020',
    prodApi: 'https://api.zombifieds.com',
    cId: 'test2',
    userId: '',
    secretKey: '00fd3c92cecb228f39743ad7a6584062',
    aesKey: '00fd3c92cecb228f39743ad7a6584062',
    aesIv: '',
    isHideCompleted: false,  // Hide completed tasks from list
    loadingTimeout: 20000
};

// Auto-detect API base from env
CONFIG.apiBase = (CONFIG.env === 'prod' ? CONFIG.prodApi : CONFIG.testApi) + '/api/v2';

/* ============================================================
 * Utility Functions
 * ============================================================ */

function getParam(name) {
    var match = window.location.search.match(new RegExp('[?&]' + name + '=([^&]*)'));
    return match ? decodeURIComponent(match[1]) : '';
}

CONFIG.userId = getParam('user_id') || 'demo_user_001';

function md5(str) {
    return CryptoJS.MD5(str).toString();
}

function buildSign(params, withSecret) {
    var raw = params.join('');
    if (withSecret) {
        raw += CONFIG.secretKey;
    }
    return md5(raw);
}

function getTs() {
    return Math.floor(Date.now() / 1000).toString();
}

/**
 * AES-128-CBC decrypt.
 * Ciphertext format (ivHex empty): base64( IV[16 bytes] + encrypted_data )
 * Ciphertext format (ivHex set):   base64( encrypted_data ), IV from ivHex
 */
function aesDecrypt(encryptedBase64, keyHex, ivHex) {
    try {
        var key = CryptoJS.enc.Hex.parse(keyHex);
        var rawData = CryptoJS.enc.Base64.parse(encryptedBase64);

        var iv;
        var ciphertext;
        if (ivHex) {
            iv = CryptoJS.enc.Hex.parse(ivHex);
            ciphertext = rawData;
        } else {
            // First 16 bytes = IV, rest = ciphertext
            if (rawData.sigBytes < 16) return '';
            iv = CryptoJS.lib.WordArray.create(rawData.words.slice(0, 4), 16);
            ciphertext = CryptoJS.lib.WordArray.create(rawData.words.slice(4), rawData.sigBytes - 16);
        }

        var decrypted = CryptoJS.AES.decrypt(
            CryptoJS.lib.CipherParams.create({ ciphertext: ciphertext }),
            key,
            { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
        );

        var result = decrypted.toString(CryptoJS.enc.Utf8);
        if (!result) {
            // Fallback: try zero IV (IV might be external/separate)
            iv = CryptoJS.enc.Hex.parse('00000000000000000000000000000000');
            decrypted = CryptoJS.AES.decrypt(
                CryptoJS.lib.CipherParams.create({ ciphertext: rawData }),
                key,
                { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
            );
            result = decrypted.toString(CryptoJS.enc.Utf8);
        }
        return result;
    } catch (e) {
        return '';
    }
}

/**
 * Decrypt AES-encrypted data field in API response.
 * Parses JSON if the decrypted result is valid JSON.
 */
function decryptResponseData(resp) {
    if (!resp || !resp.data || typeof resp.data !== 'string') {
        return resp;
    }
    var decrypted = aesDecrypt(resp.data, CONFIG.aesKey, CONFIG.aesIv);
    if (decrypted) {
        try {
            resp._decrypted = JSON.parse(decrypted);
        } catch (e) {
            resp._decrypted = decrypted;
        }
    }
    return resp;
}

/* ============================================================
 * HTTP Helpers
 * ============================================================ */

function apiGet(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.timeout = 15000;
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                try {
                    var resp = JSON.parse(xhr.responseText);
                    callback(null, resp);
                } catch (e) {
                    callback(new Error('Invalid response'), null);
                }
            } else {
                callback(new Error('HTTP ' + xhr.status), null);
            }
        }
    };
    xhr.onerror = function() {
        callback(new Error('Network error'), null);
    };
    xhr.ontimeout = function() {
        callback(new Error('Request timeout'), null);
    };
    xhr.send();
}

function apiPost(url, body, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.timeout = 15000;
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                try {
                    var resp = JSON.parse(xhr.responseText);
                    callback(null, resp);
                } catch (e) {
                    callback(new Error('Invalid response'), null);
                }
            } else {
                callback(new Error('HTTP ' + xhr.status), null);
            }
        }
    };
    xhr.onerror = function() {
        callback(new Error('Network error'), null);
    };
    xhr.ontimeout = function() {
        callback(new Error('Request timeout'), null);
    };
    xhr.send(JSON.stringify(body));
}

/* ============================================================
 * Task Icon Mapping
 * ============================================================ */

var ICON_MAP = {
    game:    { icon: 'game',   emoji: '&#127918;' },
    video:   { icon: 'video',  emoji: '&#127916;' },
    news:    { icon: 'news',   emoji: '&#128240;' },
    novel:   { icon: 'novel',  emoji: '&#128214;' },
    survey:  { icon: 'survey', emoji: '&#128221;' },
    default: { icon: 'game',   emoji: '&#127918;' }
};

function mapTaskIcon(category, type) {
    var cat = (category || '').toLowerCase();
    var typ = (type || '').toLowerCase();

    if (cat.indexOf('game') !== -1 || cat.indexOf('游戏') !== -1 || typ.indexOf('game') !== -1) {
        return ICON_MAP.game;
    }
    if (cat.indexOf('video') !== -1 || cat.indexOf('视频') !== -1 || typ.indexOf('video') !== -1) {
        return ICON_MAP.video;
    }
    if (cat.indexOf('news') !== -1 || cat.indexOf('新闻') !== -1 || cat.indexOf('资讯') !== -1) {
        return ICON_MAP.news;
    }
    if (cat.indexOf('novel') !== -1 || cat.indexOf('小说') !== -1 || cat.indexOf('阅读') !== -1) {
        return ICON_MAP.novel;
    }
    if (cat.indexOf('survey') !== -1 || cat.indexOf('问卷') !== -1 || cat.indexOf('调查') !== -1) {
        return ICON_MAP.survey;
    }
    return ICON_MAP.default;
}

/** Normalize a task object from API format to UI format */
function normalizeTask(raw) {
    var iconData = mapTaskIcon(raw.category || '', raw.type || '');
    var status = 'available';
    if (raw.is_finish === 1 && raw.is_claim !== 1) {
        status = 'claim';
    } else if (raw.is_finish === 1) {
        status = 'done';
    }

    return {
        t_id: raw.t_id,
        name: raw.title || raw.name || '',
        desc: raw.desc || '',
        type: raw.type || 'h5',
        category: raw.category || '',
        link: raw.link || '',
        reward: raw.price || raw.reward || 0,
        priceRange: raw.priceRange || '',
        target: 1,
        isFinish: raw.is_finish === 1,
        isClaim: raw.is_claim === 1,
        total: raw.total || 0,
        finish: raw.finish || 0,
        status: status,
        icon: iconData.icon,
        emoji: iconData.emoji
    };
}

/** Normalize an array of task objects */
function normalizeTasks(rawList) {
    var result = [];
    for (var i = 0; i < rawList.length; i++) {
        result.push(normalizeTask(rawList[i]));
    }
    return result;
}

/** Build checkin days array from API checkin object */
function normalizeCheckin(checkinData) {
    if (!checkinData) return null;

    var ci = checkinData;
    var totalDays = ci.days_total || 7;
    var rewards = ci.rewards || [];
    var checked = ci.checked || [];
    var daysChecked = ci.days_checked || 0;
    var index = ci.index || daysChecked;

    var days = [];
    for (var i = 0; i < totalDays; i++) {
        days.push({
            day: i + 1,
            checked: checked[i] === 1,
            isToday: (i === index) && checked[i] !== 1,
            reward: rewards[i] || 0
        });
    }

    // Determine if today is already checked
    var checkedToday = false;
    if (index > 0 && index <= totalDays && checked[index - 1] === 1) {
        checkedToday = true;
    }

    return {
        days: days,
        streak: daysChecked,
        checkedToday: checkedToday,
        mode: ci.mode || 'daily',
        method: ci.method || '',
        makeup: ci.makeup || '',
        isBreak: ci.is_break === 1,
        raw: ci
    };
}

/* ============================================================
 * Mock Data (API fallbacks)
 * ============================================================ */

function getMockCheckinData() {
    var days = [];
    var rewards = [5, 10, 15, 20, 25, 30, 50];
    var streak = 5;
    for (var i = 1; i <= 7; i++) {
        days.push({
            day: i,
            checked: i <= streak,
            isToday: i === streak + 1,
            reward: rewards[i - 1]
        });
    }
    return { days: days, streak: streak, checkedToday: false };
}

function getMockTasks() {
    return [
        { t_id: 'task_001', name: 'Play Mini Game', desc: 'Play game and stay for 30 seconds', type: 'game_stay', category: 'game', link: '', reward: 30, target: 30, status: 'available', icon: 'game', emoji: '&#127918;', isFinish: false, isClaim: false, total: 1, finish: 0 },
        { t_id: 'task_002', name: 'Watch Short Video', desc: 'Watch a video to completion', type: 'video_click', category: 'video', link: '', reward: 20, target: 1, status: 'available', icon: 'video', emoji: '&#127916;', isFinish: false, isClaim: false, total: 1, finish: 0 },
        { t_id: 'task_003', name: 'Read Article', desc: 'Read an interesting article', type: 'news_click', category: 'news', link: '', reward: 15, target: 1, status: 'available', icon: 'news', emoji: '&#128240;', isFinish: false, isClaim: false, total: 1, finish: 0 },
        { t_id: 'task_004', name: 'Read Novel', desc: 'Read a chapter of a novel', type: 'novel_click', category: 'novel', link: '', reward: 15, target: 1, status: 'available', icon: 'novel', emoji: '&#128214;', isFinish: false, isClaim: false, total: 1, finish: 0 },
        { t_id: 'task_005', name: 'Fill Survey', desc: 'Complete a quick survey', type: 'questionnaire_click', category: 'survey', link: '', reward: 25, target: 1, status: 'available', icon: 'survey', emoji: '&#128221;', isFinish: false, isClaim: false, total: 1, finish: 0 },
        { t_id: 'task_006', name: 'Watch Video & Stay', desc: 'Watch video for 60 seconds', type: 'video_stay', category: 'video', link: '', reward: 40, target: 60, status: 'available', icon: 'video', emoji: '&#127910;', isFinish: false, isClaim: false, total: 1, finish: 0 },
        { t_id: 'task_007', name: 'Browse Article', desc: 'Browse article for 30 seconds', type: 'news_stay', category: 'news', link: '', reward: 20, target: 30, status: 'available', icon: 'news', emoji: '&#128214;', isFinish: false, isClaim: false, total: 1, finish: 0 }
    ];
}

function getMockRewards() {
    return [
        { id: 1, name: '1-Day VIP', points: 200, emoji: '&#11088;' },
        { id: 2, name: '3-Day VIP', points: 500, emoji: '&#127775;' },
        { id: 3, name: '7-Day VIP', points: 1000, emoji: '&#128142;' },
        { id: 4, name: '30-Day VIP', points: 3500, emoji: '&#127941;' }
    ];
}

function getMockHistory() {
    return [
        { points: 30, type: 'earn', remark: 'Completed: Play Mini Game', created_at: '2026-07-07 10:30:00' },
        { points: 25, type: 'earn', remark: 'Daily Check-in (Day 5)', created_at: '2026-07-07 08:00:00' },
        { points: -200, type: 'spend', remark: 'Redeemed: 1-Day VIP', created_at: '2026-07-06 15:20:00' },
        { points: 40, type: 'earn', remark: 'Completed: Watch Video', created_at: '2026-07-06 14:10:00' },
        { points: 20, type: 'earn', remark: 'Daily Check-in (Day 4)', created_at: '2026-07-06 08:05:00' },
        { points: 15, type: 'earn', remark: 'Completed: Read Article', created_at: '2026-07-05 11:45:00' },
        { points: 20, type: 'earn', remark: 'Daily Check-in (Day 3)', created_at: '2026-07-05 08:00:00' },
        { points: -20, type: 'spend', remark: 'Points expired', created_at: '2026-07-04 00:00:00' }
    ];
}

/* ============================================================
 * API Functions
 * ============================================================ */

/**
 * Fetch task list, points, and check-in status in one call.
 * GET /api/v2/tasklists
 * Response data (AES-encrypted): { task: [...], points: int, checkin: {...}, expire_point, expire_date, ad_unit_id }
 */
function fetchTaskLists(callback) {
    var ts = getTs();
    var sign = buildSign([CONFIG.cId, CONFIG.userId, ts], true);
    var url = CONFIG.apiBase + '/tasklists?c_id=' + encodeURIComponent(CONFIG.cId)
        + '&user_id=' + encodeURIComponent(CONFIG.userId)
        + '&ts=' + ts + '&sign=' + sign;

    if (CONFIG.isHideCompleted) {
        url += '&is_hide=1';
    }

    apiGet(url, function(err, resp) {
        if (err) { callback(err, null); return; }

        resp = decryptResponseData(resp);

        if (resp._decrypted && typeof resp._decrypted === 'object') {
            var data = resp._decrypted;

            // Normalize tasks
            var tasks = [];
            if (data.task && data.task.length !== undefined) {
                tasks = normalizeTasks(data.task);
            }

            // Normalize checkin
            var checkinNorm = null;
            if (data.checkin) {
                checkinNorm = normalizeCheckin(data.checkin);
            }

            callback(null, {
                tasks: tasks,
                points: data.points || 0,
                checkin: checkinNorm,
                expirePoint: data.expire_point || 0,
                expireDate: data.expire_date || '',
                adUnitId: data.ad_unit_id || ''
            });
        } else if (resp.code === 0 && resp.data) {
            // Data wasn't encrypted or decryption failed
            callback(null, resp);
        } else {
            callback(new Error(resp.msg || 'Failed to load task list'), null);
        }
    });
}

/** Get points details / history (separate endpoint for history view) */
function fetchPoints(callback) {
    var ts = getTs();
    var sign = buildSign([CONFIG.cId, CONFIG.userId, ts], true);
    var url = CONFIG.apiBase + '/points?c_id=' + encodeURIComponent(CONFIG.cId)
        + '&user_id=' + encodeURIComponent(CONFIG.userId)
        + '&ts=' + ts + '&sign=' + sign;
    apiGet(url, function(err, resp) {
        if (err) { callback(err, null); return; }
        resp = decryptResponseData(resp);
        if (resp._decrypted) {
            callback(null, resp._decrypted);
        } else if (resp.code === 0 && resp.data) {
            callback(null, resp);
        } else {
            callback(null, resp);
        }
    });
}

/** Daily check-in */
function apiCheckin(isMakeup, callback) {
    var ts = getTs();
    var sign = buildSign([CONFIG.cId, CONFIG.userId, ts], true);
    var url = CONFIG.apiBase + '/checkin?c_id=' + encodeURIComponent(CONFIG.cId)
        + '&user_id=' + encodeURIComponent(CONFIG.userId)
        + '&ts=' + ts + '&sign=' + sign;
    if (isMakeup) {
        url += '&is_makeup=' + encodeURIComponent(isMakeup);
    }
    apiGet(url, function(err, resp) {
        callback(err, resp);
    });
}

/** Get landing page URL for a task (AES-encrypted response) */
function apiLanding(tId, callback) {
    var ts = getTs();
    var sign = buildSign([CONFIG.cId, String(tId), ts], true);
    var url = CONFIG.apiBase + '/landing?c_id=' + encodeURIComponent(CONFIG.cId)
        + '&t_id=' + encodeURIComponent(tId)
        + '&ts=' + ts + '&sign=' + sign;
    apiGet(url, function(err, resp) {
        if (err) { callback(err, null); return; }
        resp = decryptResponseData(resp);
        callback(null, resp);
    });
}

/** Report task status (click/arrive/finish) */
function apiReport(tId, act, site, callback) {
    var ts = getTs();
    site = site || '';
    var sign = buildSign([CONFIG.cId, String(tId), site, act, ts], false);
    var url = CONFIG.apiBase + '/report?c_id=' + encodeURIComponent(CONFIG.cId)
        + '&t_id=' + encodeURIComponent(tId)
        + '&act=' + encodeURIComponent(act)
        + '&site=' + encodeURIComponent(site)
        + '&ts=' + ts + '&sign=' + sign;
    apiGet(url, function(err, resp) {
        callback(err, resp);
    });
}

/** Claim task points */
function apiClaim(tId, callback) {
    var ts = getTs();
    var sign = buildSign([CONFIG.cId, String(tId), CONFIG.userId, ts], true);
    var url = CONFIG.apiBase + '/claim?c_id=' + encodeURIComponent(CONFIG.cId)
        + '&user_id=' + encodeURIComponent(CONFIG.userId)
        + '&t_id=' + encodeURIComponent(tId)
        + '&ts=' + ts + '&sign=' + sign;
    apiGet(url, function(err, resp) {
        callback(err, resp);
    });
}

/** Get rewards list */
function fetchRewards(callback) {
    var ts = getTs();
    var sign = buildSign([CONFIG.cId, CONFIG.userId, ts], true);
    var url = CONFIG.apiBase + '/rewards?c_id=' + encodeURIComponent(CONFIG.cId)
        + '&user_id=' + encodeURIComponent(CONFIG.userId)
        + '&ts=' + ts + '&sign=' + sign;
    apiGet(url, function(err, resp) {
        if (err) { callback(err, null); return; }
        resp = decryptResponseData(resp);
        if (resp._decrypted) {
            callback(null, resp._decrypted);
        } else {
            callback(null, resp);
        }
    });
}

/** Exchange points for reward */
function apiExchange(rewardId, callback) {
    var ts = getTs();
    var sign = buildSign([CONFIG.cId, CONFIG.userId, String(rewardId), ts], true);
    var url = CONFIG.apiBase + '/exchange?c_id=' + encodeURIComponent(CONFIG.cId)
        + '&user_id=' + encodeURIComponent(CONFIG.userId)
        + '&reward_id=' + encodeURIComponent(rewardId)
        + '&ts=' + ts + '&sign=' + sign;
    apiGet(url, function(err, resp) {
        callback(err, resp);
    });
}
