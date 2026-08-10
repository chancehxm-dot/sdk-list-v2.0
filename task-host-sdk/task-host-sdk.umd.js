!function(t, e) {
  "object" == typeof exports && "undefined" != typeof module ? e(exports) : "function" == typeof define && define.amd ? define(["exports"], e) : e((t = "undefined" != typeof globalThis ? globalThis : t || self).TaskHostSDK = {})
}(this, function(t) {
  "use strict";
  var e = Object.defineProperty
    , s = Object.getOwnPropertySymbols
    , i = Object.prototype.hasOwnProperty
    , n = Object.prototype.propertyIsEnumerable
    , r = (t, s, i) => s in t ? e(t, s, {
    enumerable: !0,
    configurable: !0,
    writable: !0,
    value: i
  }) : t[s] = i
    , a = (t, e, s) => new Promise( (i, n) => {
    var r = t => {
      try {
        o(s.next(t))
      } catch (e) {
        n(e)
      }
    }
      , a = t => {
      try {
        o(s.throw(t))
      } catch (e) {
        n(e)
      }
    }
      , o = t => t.done ? i(t.value) : Promise.resolve(t.value).then(r, a);
    o((s = s.apply(t, e)).next())
  }
  );
  const o = 1e4;
  function l(t) {
    return a(this, arguments, function*(t, e={}) {
      const {method: a="GET", headers: l={}, body: d, params: h, timeout: u=o, keepalive: _=!1} = e;
      let p = t;
      if (h) {
        const e = new URLSearchParams(h).toString();
        p = `${t}${t.includes("?") ? "&" : "?"}${e}`
      }
      const m = ( (t, e) => {
        for (var a in e || (e = {}))
          i.call(e, a) && r(t, a, e[a]);
        if (s)
          for (var a of s(e))
            n.call(e, a) && r(t, a, e[a]);
        return t
      }
      )({}, l);
      null != d && (m["Content-Type"] = "application/json"),
      m["X-Requested-With"] = "XMLHttpRequest";
      const g = null != d ? JSON.stringify(d) : void 0;
      if ("function" == typeof fetch)
        try {
          const t = yield function(t, e, s) {
            return Promise.race([fetch(t, e), new Promise( (t, e) => setTimeout( () => e(new Error("Timeout")), s))])
          }(p, {
            method: a,
            headers: m,
            body: g,
            keepalive: _
          }, u);
          if (!t.ok)
            throw new Error(`HTTP ${t.status}`);
          return t.json()
        } catch (f) {
          return c(p, {
            method: a,
            headers: m,
            body: g,
            timeout: u
          })
        }
      return c(p, {
        method: a,
        headers: m,
        body: g,
        timeout: u
      })
    })
  }
  function c(t, e) {
    return new Promise( (s, i) => {
      const n = new XMLHttpRequest;
      n.open(e.method, t, !0),
      Object.entries(e.headers).forEach( ([t,e]) => n.setRequestHeader(t, e)),
      n.timeout = e.timeout,
      n.ontimeout = () => i(new Error("XHR timeout")),
      n.onerror = () => i(new Error("XHR network error")),
      n.onload = () => {
        if (n.status >= 200 && n.status < 300)
          try {
            s(JSON.parse(n.responseText))
          } catch (t) {
            s(n.responseText)
          }
        else
          i(new Error(`XHR ${n.status}`))
      }
      ,
      n.send(e.body || null)
    }
    )
  }
  const d = {
    game_click: "click",
    video_click: "click",
    news_click: "click",
    novel_click: "click",
    questionnaire_click: "click",
    game_stay: "stay",
    video_stay: "stay",
    news_stay: "stay",
    novel_stay: "stay"
  }
    , h = {
    game_click: ["#start-game-btn", ".play-button", '[data-action="play"]', ".game-start", ".btn-play"],
    video_click: ["video", ".video-player", "[data-player]"],
    news_click: ["article", ".article-content", ".post-body", ".entry-content"],
    novel_click: [".reader", ".chapter-content", ".novel-content", "#reader"],
    questionnaire_click: ["form", ".questionnaire", ".survey-form", "#survey"]
  }
    , u = {
    game_stay: ["#game-container", ".game-frame", "[data-game]", ".game-page", 'iframe[src*="game"]'],
    video_stay: ["video", ".video-player", "[data-player]", ".video-container"],
    news_stay: ["article", ".article-content", ".post-body", ".entry-content", ".news-detail"],
    novel_stay: [".reader", ".chapter-content", ".novel-content", "#reader", ".book-content"]
  };
  class _ {
    report(t) {
      return a(this, null, function*() {
        yield new Promise(t => setTimeout(t, 40))
      })
    }
  }
  class p {
    constructor(t, e) {
      this.baseURL = t,
      this.ver = e || "v2"
    }
    report(t) {
      return a(this, null, function*() {
        const e = `${this.baseURL}/api/${this.ver}/report`
          , s = {
          c_id: t.c_id,
          t_id: t.t_id,
          site: t.site,
          act: t.act,
          ts: t.ts,
          sign: t.sign
        };
        if ("f" !== t.act)
          try {
            yield l(e, {
              method: "POST",
              body: s,
              keepalive: !0
            })
          } catch (i) {}
        else
          try {
            return void (yield l(e, {
              method: "POST",
              body: s,
              timeout: 3e3
            }))
          } catch (i) {
            try {
              !function(t, e) {
                const s = JSON.stringify(e);
                if ("function" == typeof fetch)
                  try {
                    return fetch(t, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        "X-Requested-With": "XMLHttpRequest"
                      },
                      body: s,
                      keepalive: !0
                    }).catch( () => {}
                    ),
                    !0
                  } catch (i) {}
                if ("undefined" != typeof navigator && "function" == typeof navigator.sendBeacon)
                  try {
                    const e = new Blob([s],{
                      type: "text/plain"
                    });
                    if (navigator.sendBeacon(t, e))
                      return !0
                  } catch (i) {}
                try {
                  const e = new XMLHttpRequest;
                  return e.open("POST", t, !1),
                  e.setRequestHeader("Content-Type", "application/json"),
                  e.setRequestHeader("X-Requested-With", "XMLHttpRequest"),
                  e.send(s),
                  e.status >= 200 && e.status < 300
                } catch (i) {
                  return !1
                }
              }(e, s)
            } catch (n) {
              "function" == typeof fetch && fetch(e, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify(s),
                keepalive: !0
              }).catch( () => {}
              )
            }
          }
      })
    }
  }
  function m() {
    const t = {};
    try {
      new URLSearchParams(window.location.search).forEach( (e, s) => {
        t[s] = e
      }
      )
    } catch (e) {
      window.location.search.slice(1).split("&").forEach(e => {
        const s = e.indexOf("=");
        s > 0 && (t[decodeURIComponent(e.slice(0, s))] = decodeURIComponent(e.slice(s + 1)))
      }
      )
    }
    return t
  }
  const g = function() {
    const t = {};
    try {
      return localStorage.setItem("__sdk_test__", "1"),
      localStorage.removeItem("__sdk_test__"),
      {
        getItem: t => localStorage.getItem(t),
        setItem: (t, e) => localStorage.setItem(t, e),
        removeItem: t => localStorage.removeItem(t)
      }
    } catch (e) {
      return {
        getItem: e => {
          var s;
          return null != (s = t[e]) ? s : null
        }
        ,
        setItem: (e, s) => {
          t[e] = s
        }
        ,
        removeItem: e => {
          delete t[e]
        }
      }
    }
  }()
    , f = "__task_host_params__";
  function b(t) {
    try {
      g.setItem(f, JSON.stringify(t))
    } catch (e) {}
  }
  function y() {
    try {
      const t = g.getItem(f);
      return t ? JSON.parse(t) : null
    } catch (t) {
      return null
    }
  }
  function k() {
    g.removeItem(f)
  }
  function v(t) {
    return "__task_click_" + t
  }
  function w(t, e) {
    try {
      g.setItem(v(t), String(e))
    } catch (s) {}
  }
  function S(t) {
    try {
      const e = g.getItem(v(t));
      return e && parseInt(e, 10) || 0
    } catch (e) {
      return 0
    }
  }
  function x(t) {
    g.removeItem(v(t))
  }
  function T(t) {
    return "__task_dur_" + t
  }
  function A(t, e) {
    try {
      g.setItem(T(t), JSON.stringify(e))
    } catch (s) {}
  }
  function C(t) {
    try {
      const e = g.getItem(T(t));
      return e ? JSON.parse(e) : null
    } catch (e) {
      return null
    }
  }
  function E(t) {
    g.removeItem(T(t))
  }
  const L = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
  class M {
    constructor(t, e, s) {
      this.adapter = t,
      this.params = e,
      this.site = function(t) {
        return t.site ? t.site : L ? "dragonkint.com" : window.location.hostname
      }(e),
      this.testSign = null != s ? s : null
    }
    show() {
      return a(this, null, function*() {
        yield this.send("s")
      })
    }
    clickStart() {
      return a(this, null, function*() {
        yield this.send("c")
      })
    }
    arrival() {
      return a(this, null, function*() {
        yield this.send("a")
      })
    }
    complete() {
      return a(this, null, function*() {
        yield this.send("f")
      })
    }
    computeSign(t, e) {
      return function(t) {
        function e(t, e) {
          return t << e | t >>> 32 - e
        }
        const s = function(t) {
          const e = [];
          for (let s = 0; s < t.length; s++) {
            const i = t.charCodeAt(s);
            if (i < 128)
              e.push(i);
            else if (i < 2048)
              e.push(192 | i >> 6, 128 | 63 & i);
            else if (i < 55296 || i >= 57344)
              e.push(224 | i >> 12, 128 | i >> 6 & 63, 128 | 63 & i);
            else {
              s++;
              const n = (1023 & i) << 10 | 1023 & t.charCodeAt(s);
              e.push(240 | n >> 18, 128 | n >> 12 & 63, 128 | n >> 6 & 63, 128 | 63 & n)
            }
          }
          return e
        }(t)
          , i = s.length
          , n = (i + 8 >>> 6) + 1 << 6
          , r = new Array(n);
        for (let g = 0; g < n; g++)
          r[g] = 0;
        for (let g = 0; g < i; g++)
          r[g] = s[g];
        r[i] = 128;
        const a = 8 * i;
        function o(t, e) {
          return (t[e] | t[e + 1] << 8 | t[e + 2] << 16 | t[e + 3] << 24) >>> 0
        }
        r[n - 8] = 255 & a,
        r[n - 7] = a >>> 8 & 255,
        r[n - 6] = a >>> 16 & 255,
        r[n - 5] = a >>> 24 & 255;
        const l = "0123456789abcdef"
          , c = [7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21]
          , d = [-680876936, -389564586, 606105819, -1044525330, -176418897, 1200080426, -1473231341, -45705983, 1770035416, -1958414417, -42063, -1990404162, 1804603682, -40341101, -1502002290, 1236535329, -165796510, -1069501632, 643717713, -373897302, -701558691, 38016083, -660478335, -405537848, 568446438, -1019803690, -187363961, 1163531501, -1444681467, -51403784, 1735328473, -1926607734, -378558, -2022574463, 1839030562, -35309556, -1530992060, 1272893353, -155497632, -1094730640, 681279174, -358537222, -722521979, 76029189, -640364487, -421815835, 530742520, -995338651, -198630844, 1126891415, -1416354905, -57434055, 1700485571, -1894986606, -1051523, -2054922799, 1873313359, -30611744, -1560198380, 1309151649, -145523070, -1120210379, 718787259, -343485551];
        let h = 1732584193
          , u = -271733879
          , _ = -1732584194
          , p = 271733878;
        for (let g = 0; g < n; g += 64) {
          let t = h
            , s = u
            , i = _
            , n = p;
          const a = new Array(16);
          for (let e = 0; e < 16; e++)
            a[e] = o(r, g + 4 * e);
          for (let r = 0; r < 64; r++) {
            let o, l;
            r < 16 ? (o = s & i | ~s & n,
            l = r) : r < 32 ? (o = n & s | ~n & i,
            l = (5 * r + 1) % 16) : r < 48 ? (o = s ^ i ^ n,
            l = (3 * r + 5) % 16) : (o = i ^ (s | ~n),
            l = 7 * r % 16);
            const h = n;
            n = i,
            i = s,
            s = s + e(t + o + d[r] + a[l], c[r]) >>> 0,
            t = h
          }
          h = h + t >>> 0,
          u = u + s >>> 0,
          _ = _ + i >>> 0,
          p = p + n >>> 0
        }
        let m = "";
        for (const g of [h, u, _, p])
          for (let t = 0; t < 4; t++)
            m += l[g >>> 8 * t + 4 & 15],
            m += l[g >>> 8 * t & 15];
        return m
      }(this.params.c + this.params.t_id + this.site + t + e)
    }
    send(t) {
      return a(this, null, function*() {
        const e = String(Math.floor(Date.now() / 1e3))
          , s = this.computeSign(t, e);
        try {
          yield this.adapter.report({
            c_id: this.params.c,
            t_id: this.params.t_id,
            site: this.site,
            act: t,
            ts: e,
            sign: s
          })
        } catch (i) {}
      })
    }
  }
  class P {
    constructor(t, e, s) {
      this.completed = !1,
      this.params = t,
      this.adapter = e,
      this.reporter = new M(e,t,s),
      this.threshold = parseInt(t.target, 10) || 0,
      this.cb = parseInt(t.cb, 10) || 0
    }
    onComplete(t) {
      return a(this, null, function*() {
        this.completed || (this.completed = !0,
        yield this.reporter.complete(),
        k(),
        this.destroy())
      })
    }
  }
  let $ = null
    , I = null;
  const H = {
    info: {
      bg: "rgba(0,0,0,0.82)",
      border: "rgba(255,255,255,0.12)"
    },
    success: {
      bg: "rgba(46,125,50,0.92)",
      border: "rgba(255,255,255,0.18)"
    },
    warn: {
      bg: "rgba(230,81,0,0.92)",
      border: "rgba(255,255,255,0.18)"
    }
  };
  let R = !1;
  function O(t, e={}) {
    !function() {
      if (R)
        return;
      R = !0;
      const t = "\n.__tsk_toast__ {\n  position:fixed; top:18px; left:50%; transform:translateX(-50%);\n  z-index:2147483647;\n  padding:10px 22px; border-radius:10px; border:1px solid transparent;\n  color:#fff; font-size:14px; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;\n  line-height:1.4; text-align:center; max-width:90vw;\n  backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px);\n  box-shadow:0 4px 16px rgba(0,0,0,0.18);\n  pointer-events:auto; user-select:none;\n  animation:__tsk_in__ .28s ease-out;\n  transition:opacity .2s, transform .2s;\n}\n@keyframes __tsk_in__ {\n  from { opacity:0; transform:translateX(-50%) translateY(-10px); }\n  to   { opacity:1; transform:translateX(-50%) translateY(0); }\n}\n.__tsk_toast_out__ {\n  opacity:0; transform:translateX(-50%) translateY(-10px);\n}\n".replace(/\s+/g, " ")
        , e = document.createElement("style");
      e.textContent = t,
      document.head.appendChild(e)
    }();
    const {duration: s=3e3, type: i="info"} = e;
    D();
    const n = document.createElement("div");
    n.className = "__tsk_toast__",
    n.textContent = t;
    const r = H[i] || H.info;
    return n.style.background = r.bg,
    n.style.borderColor = r.border,
    document.body.appendChild(n),
    $ = n,
    s > 0 && (I = setTimeout(D, s)),
    D
  }
  function D() {
    if (I && (clearTimeout(I),
    I = null),
    !$)
      return;
    $.classList.add("__tsk_toast_out__");
    const t = $;
    $ = null,
    setTimeout( () => t.remove(), 220)
  }
  const q = function() {
    try {
      const t = new URLSearchParams(window.location.search).get("lang");
      if (!t)
        return "en";
      if ("zh" === t || "zh-CN" === t || "zh-TW" === t)
        return "zh";
      if ("en" === t)
        return "en"
    } catch (t) {}
    return "undefined" != typeof navigator && navigator.language && navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en"
  }()
    , N = {
    en: {
      click_start: (t, e, s) => `Tap the ${t} to complete the task (${e}/${s})`,
      click_progress: (t, e) => `Tapped ${t}/${e}`,
      click_restored: (t, e) => `Resumed — already tapped ${t}/${e}`,
      click_no_target: t => `Look for the ${t} on this page and tap it`,
      dur_start: (t, e) => `Stay on the ${t} page for ${e}s to complete the task`,
      dur_restored: t => `Resumed — stay for ${Math.ceil(t)} more seconds`,
      dur_paused: "Paused",
      dur_wrong_page: (t, e) => `Go to the ${t} page and stay for ${e}s to complete the task`,
      dur_click_start: (t, e) => `Click the ${t} to start — stay for ${e}s to complete`,
      dur_complete: "Task complete!",
      task_done: "Task complete!",
      blocked: t => `Click blocked by ad-shield (cb=${t})`,
      label_game_click: "Play button",
      label_video_click: "video player",
      label_news_click: "article area",
      label_novel_click: "chapter",
      label_questionnaire: "survey form",
      label_game_stay: "game",
      label_video_stay: "video",
      label_news_stay: "article",
      label_novel_stay: "novel",
      label_fallback: "target",
      resumed: "Resumed",
      paused: "Paused"
    },
    zh: {
      click_start: (t, e, s) => `👆 点击${t}完成任务 (${e}/${s})`,
      click_progress: (t, e) => `✅ 已点击 ${t}/${e}`,
      click_restored: (t, e) => `✅ 已点击 ${t}/${e} — 请继续`,
      click_no_target: t => `👆 请在页面中找到 ${t} 并点击`,
      dur_start: (t, e) => `⏱ 请在${t}页面停留 ${e} 秒完成任务`,
      dur_restored: t => `⏱ 已恢复计时，还需停留 ${Math.ceil(t)} 秒`,
      dur_paused: "暂停",
      dur_wrong_page: (t, e) => `👆 请前往${t}页面停留 ${e} 秒完成任务`,
      dur_click_start: (t, e) => `👆 点击${t}开始计时，停留 ${e} 秒完成任务`,
      dur_complete: "任务完成！",
      task_done: "🎉 任务完成！",
      blocked: t => `点击被屏蔽 (cb=${t})`,
      label_game_click: "游戏按钮",
      label_video_click: "视频播放器",
      label_news_click: "文章区域",
      label_novel_click: "小说章节",
      label_questionnaire: "问卷表单",
      label_game_stay: "游戏",
      label_video_stay: "视频",
      label_news_stay: "文章",
      label_novel_stay: "小说",
      label_fallback: "目标元素",
      resumed: "已恢复",
      paused: "已暂停"
    }
  };
  function z(t, ...e) {
    const s = N[q][t];
    return "function" == typeof s ? s(...e) : s
  }
  function V(t) {
    return z({
      game_click: "label_game_click",
      video_click: "label_video_click",
      news_click: "label_news_click",
      novel_click: "label_novel_click",
      questionnaire_click: "label_questionnaire",
      game_stay: "label_game_stay",
      video_stay: "label_video_stay",
      news_stay: "label_news_stay",
      novel_stay: "label_novel_stay"
    }[t] || "label_fallback")
  }
  let X = !1;
  class j extends P {
    constructor(t, e, s) {
      super(t, e, s),
      this.count = 0,
      this.observer = null,
      this.highlightEls = [],
      this.dismissToast = null,
      this.unloadGuard = null,
      this.onDocumentEvent = t => {
        if (this.completed)
          return;
        const e = t.target;
        if (!e)
          return;
        const s = this.closestMatch(e);
        if (s && this.isVisible(s) && !(this.cb > 0 && Math.floor(100 * Math.random()) < this.cb) && (this.count++,
        w(this.params.t_id, this.count),
        this.updateProgressToast(),
        this.count >= this.threshold)) {
          t.preventDefault(),
          t.stopPropagation(),
          t.stopImmediatePropagation(),
          x(this.params.t_id),
          this.clearHighlight(),
          this.showCompleteToast();
          const e = this.resolveNavHref(s);
          this.completeAndNavigate(e)
        }
      }
      ,
      this.selectors = h[this.params.type] || [],
      this.eventName = "video_click" === t.type ? "ended" : "click"
    }
    start() {
      !function() {
        if (X)
          return;
        X = !0;
        const t = "\n.__tsk_hl__ {\n  animation: __tsk_hl_pulse__ 0.9s ease-in-out 2;\n}\n@keyframes __tsk_hl_pulse__ {\n  0%   { box-shadow: 0 0 0 0    rgba(255,152,0,0.6); outline: 3px solid rgba(255,152,0,0.55); }\n  50%  { box-shadow: 0 0 0 10px rgba(255,152,0,0);   outline: 3px solid rgba(255,152,0,0.15); }\n  100% { box-shadow: 0 0 0 0    rgba(255,152,0,0);   outline: 3px solid rgba(255,152,0,0);   }\n}\n.__tsk_hl__ {\n  outline: 3px solid rgba(255,152,0,0);\n  transition: outline .35s;\n  border-radius: 2px;\n}\n".replace(/\s+/g, " ")
          , e = document.createElement("style");
        e.textContent = t,
        document.head.appendChild(e)
      }(),
      this.count = S(this.params.t_id),
      document.addEventListener(this.eventName, this.onDocumentEvent, !0),
      this.setupUnloadGuard(),
      this.checkDom(),
      this.showInitialHint()
    }
    destroy() {
      var t;
      document.removeEventListener(this.eventName, this.onDocumentEvent, !0),
      this.teardownUnloadGuard(),
      null == (t = this.dismissToast) || t.call(this),
      this.clearHighlight(),
      this.observer && (this.observer.disconnect(),
      this.observer = null)
    }
    showInitialHint() {
      const t = V(this.params.type);
      if (this.hasMatch()) {
        this.highlightEls = this.allVisibleMatches();
        for (const t of this.highlightEls)
          t.classList.add("__tsk_hl__");
        this.highlightEls.length > 0 && setTimeout( () => this.clearHighlight(), 2200),
        this.count > 0 ? this.dismissToast = O(z("click_restored", this.count, this.threshold), {
          duration: 2500
        }) : this.dismissToast = O(z("click_start", t, 0, this.threshold), {
          duration: 3500
        })
      } else
        this.dismissToast = O(z("click_no_target", t), {
          duration: 4e3,
          type: "warn"
        })
    }
    updateProgressToast() {
      var t;
      null == (t = this.dismissToast) || t.call(this),
      this.completed || (this.dismissToast = O(z("click_progress", this.count, this.threshold), {
        duration: 2e3
      }))
    }
    showCompleteToast() {
      var t;
      null == (t = this.dismissToast) || t.call(this),
      O(z("task_done"), {
        duration: 2500,
        type: "success"
      })
    }
    clearHighlight() {
      for (const t of this.highlightEls)
        t.classList.remove("__tsk_hl__");
      this.highlightEls = []
    }
    resolveNavHref(t) {
      const e = t.closest("a[href]");
      if (e) {
        const t = e.getAttribute("href") || "";
        if (t && !t.startsWith("javascript:") && "#" !== t)
          return e.href
      }
      const s = t.closest("[data-href], [data-url]");
      return s ? s.getAttribute("data-href") || s.getAttribute("data-url") : null
    }
    completeAndNavigate(t) {
      return a(this, null, function*() {
        try {
          yield this.onComplete({
            clickCount: this.count
          })
        } catch (e) {}
        t && setTimeout( () => {
          window.location.href = t
        }
        , 300)
      })
    }
    closestMatch(t) {
      for (const s of this.selectors)
        try {
          const e = t.closest(s);
          if (e)
            return e
        } catch (e) {}
      return null
    }
    isVisible(t) {
      const e = window.getComputedStyle(t)
        , s = t.getBoundingClientRect();
      return "none" !== e.display && "hidden" !== e.visibility && parseFloat(e.opacity) > 0 && s.width > 0 && s.height > 0
    }
    allVisibleMatches() {
      const t = new Set;
      for (const s of this.selectors)
        try {
          document.querySelectorAll(s).forEach(e => {
            this.isVisible(e) && t.add(e)
          }
          )
        } catch (e) {}
      return Array.from(t)
    }
    checkDom() {
      this.hasMatch() || this.startObserver()
    }
    hasMatch() {
      return this.selectors.some(t => {
        try {
          return !!document.querySelector(t)
        } catch (e) {
          return !1
        }
      }
      )
    }
    startObserver() {
      this.observer || (this.observer = new MutationObserver( () => {
        var t;
        this.hasMatch() && (null == (t = this.observer) || t.disconnect(),
        this.observer = null,
        this.showInitialHint())
      }
      ),
      this.observer.observe(document.documentElement, {
        childList: !0,
        subtree: !0
      }))
    }
    setupUnloadGuard() {
      const t = () => {
        this.completed || this.count >= this.threshold && (x(this.params.t_id),
        this.clearHighlight(),
        this.reporter.complete())
      }
      ;
      this.unloadGuard = t,
      window.addEventListener("pagehide", t)
    }
    teardownUnloadGuard() {
      this.unloadGuard && (window.removeEventListener("pagehide", this.unloadGuard),
      this.unloadGuard = null)
    }
  }
  const U = 2 * Math.PI * 25;
  let B = !1;
  function G() {
    !function() {
      if (B)
        return;
      B = !0;
      const t = "\n.__tsk_bdg__{position:fixed;right:20px;bottom:24px;z-index:2147483646;\n  width:54px;height:54px;border-radius:50%;\n  background:#fff;box-shadow:0 2px 12px rgba(0,0,0,0.15);\n  display:flex;align-items:center;justify-content:center;\n  font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;\n  pointer-events:none;user-select:none;\n  animation:__tsk_bdg_in__ .3s ease-out;}\n@keyframes __tsk_bdg_in__{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:scale(1)}}\n.__tsk_bdg_ring__{position:absolute;top:0;left:0;transform:rotate(-90deg)}\n.__tsk_bdg_ring_bg__{stroke:#e8e8e8;fill:none;stroke-width:4}\n.__tsk_bdg_ring_fg__{fill:none;stroke-width:4;stroke-linecap:round;\n  transition:stroke-dashoffset .45s ease,stroke .3s}\n.__tsk_bdg_num__{font-size:15px;font-weight:600;color:#333;z-index:1}\n.__tsk_bdg_paused__ .__tsk_bdg_num__{font-size:12px}\n.__tsk_bdg_complete__{animation:__tsk_bdg_pop__ .35s ease}\n@keyframes __tsk_bdg_pop__{0%{transform:scale(1)}50%{transform:scale(1.18)}100%{transform:scale(1)}}\n".replace(/\s+/g, " ")
        , e = document.createElement("style");
      e.textContent = t,
      document.head.appendChild(e)
    }();
    const t = document.createElement("div");
    t.className = "__tsk_bdg__";
    const e = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    e.setAttribute("class", "__tsk_bdg_ring__"),
    e.setAttribute("width", String(54)),
    e.setAttribute("height", String(54));
    const s = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    s.setAttribute("class", "__tsk_bdg_ring_bg__"),
    s.setAttribute("cx", String(27)),
    s.setAttribute("cy", String(27)),
    s.setAttribute("r", String(25)),
    e.appendChild(s);
    const i = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    i.setAttribute("class", "__tsk_bdg_ring_fg__"),
    i.setAttribute("cx", String(27)),
    i.setAttribute("cy", String(27)),
    i.setAttribute("r", String(25)),
    i.setAttribute("stroke-dasharray", String(U)),
    i.setAttribute("stroke-dashoffset", "0"),
    i.setAttribute("stroke", "#4caf50"),
    e.appendChild(i),
    t.appendChild(e);
    const n = document.createElement("span");
    n.className = "__tsk_bdg_num__",
    n.textContent = "",
    t.appendChild(n),
    document.body.appendChild(t);
    let r = !1;
    return {
      update(e, s, a) {
        if (r)
          return;
        const o = s > 0 ? Math.max(0, Math.min(1, e / s)) : 1;
        i.setAttribute("stroke-dashoffset", String(U * (1 - o))),
        a ? (i.setAttribute("stroke", "#9e9e9e"),
        n.textContent = "⏸",
        t.classList.add("__tsk_bdg_paused__")) : (i.setAttribute("stroke", o < .3 ? "#ff9800" : "#4caf50"),
        n.textContent = String(Math.max(0, Math.ceil(e))),
        t.classList.remove("__tsk_bdg_paused__"))
      },
      complete() {
        r || (r = !0,
        i.setAttribute("stroke", "#4caf50"),
        i.setAttribute("stroke-dashoffset", "0"),
        n.textContent = "✅",
        t.classList.add("__tsk_bdg_complete__"),
        t.classList.remove("__tsk_bdg_paused__"),
        setTimeout( () => this.destroy(), 2e3))
      },
      destroy() {
        t.style.opacity = "0",
        t.style.transition = "opacity .25s",
        setTimeout( () => t.remove(), 260)
      }
    }
  }
  const J = class t extends P {
    constructor(t, e, s) {
      super(t, e, s),
      this.pausedAccumulated = 0,
      this.pauseStartedAt = 0,
      this.isVisible = !0,
      this.timer = null,
      this.badge = null,
      this.startSelector = null,
      this.startClickListener = null,
      this.onPageHide = () => {
        this.isVisible && (this.isVisible = !1,
        this.pauseStartedAt = Date.now()),
        this.persistDuration()
      }
      ,
      this.onVisibility = () => {
        if (document.hidden) {
          if (!this.isVisible)
            return;
          this.isVisible = !1,
          this.pauseStartedAt = Date.now(),
          this.persistDuration(),
          this.updateBadge()
        } else {
          if (this.isVisible)
            return;
          this.isVisible = !0,
          this.pauseStartedAt > 0 && (this.pausedAccumulated += Date.now() - this.pauseStartedAt,
          this.pauseStartedAt = 0),
          this.updateBadge()
        }
      }
      ,
      this.startSelector = t.start_selector || null;
      const i = C(t.t_id);
      i ? (this.startedAt = i.startedAt,
      this.pausedAccumulated = i.pausedAccumulated) : this.startedAt = Date.now(),
      this.requireScroll = "news_stay" === t.type || "novel_stay" === t.type ? .6 : 0
    }
    start() {
      if (!this.isOnTargetPage())
        return void O(z("dur_wrong_page", V(this.params.type), this.threshold), {
          duration: 5e3,
          type: "warn"
        });
      const t = C(this.params.t_id);
      !this.startSelector || t ? this.doStart(!!t) : this.pendClickStart()
    }
    destroy() {
      var t;
      window.removeEventListener("pagehide", this.onPageHide),
      this.teardownStartClickListener(),
      this.timer && (clearInterval(this.timer),
      this.timer = null),
      document.removeEventListener("visibilitychange", this.onVisibility),
      null == (t = this.badge) || t.destroy(),
      this.badge = null
    }
    pendClickStart() {
      O(z("dur_click_start", V(this.params.type), this.threshold), {
        duration: 5e3,
        type: "warn"
      });
      const t = t => {
        const e = t.target;
        if (e) {
          try {
            if (!e.closest(this.startSelector))
              return
          } catch (s) {
            return
          }
          this.teardownStartClickListener(),
          this.doStart(!1)
        }
      }
      ;
      this.startClickListener = t,
      document.addEventListener("click", t, !0)
    }
    teardownStartClickListener() {
      this.startClickListener && (document.removeEventListener("click", this.startClickListener, !0),
      this.startClickListener = null)
    }
    doStart(e) {
      window.addEventListener("pagehide", this.onPageHide),
      document.addEventListener("visibilitychange", this.onVisibility),
      this.timer = setInterval( () => this.tick(), t.TICK_MS),
      e ? (this.pauseStartedAt > 0 && (this.pausedAccumulated += Date.now() - this.pauseStartedAt,
      this.pauseStartedAt = 0),
      this.isVisible = !0) : this.reporter.arrival(),
      this.badge = G(),
      this.updateBadge();
      const s = V(this.params.type);
      e ? O(z("dur_restored", Math.max(0, this.threshold - this.getElapsedMs() / 1e3)), {
        duration: 3e3
      }) : O(z("dur_start", s, this.threshold), {
        duration: 3500
      })
    }
    getElapsedMs() {
      let t = Date.now() - this.startedAt - this.pausedAccumulated;
      return !this.isVisible && this.pauseStartedAt > 0 && (t -= Date.now() - this.pauseStartedAt),
      Math.max(0, t)
    }
    tick() {
      var t;
      this.completed || (this.updateBadge(),
      this.persistDuration(),
      this.getElapsedMs() / 1e3 < this.threshold || this.validateScroll() && (E(this.params.t_id),
      null == (t = this.badge) || t.complete(),
      O(z("task_done"), {
        duration: 2500,
        type: "success"
      }),
      this.onComplete({
        durationMs: this.getElapsedMs(),
        thresholdSec: this.threshold,
        scrollRate: this.getScrollRate()
      })))
    }
    updateBadge() {
      if (!this.badge)
        return;
      const t = Math.max(0, this.threshold - this.getElapsedMs() / 1e3);
      this.badge.update(t, this.threshold, !this.isVisible)
    }
    persistDuration() {
      A(this.params.t_id, {
        startedAt: this.startedAt,
        pausedAccumulated: this.pausedAccumulated
      })
    }
    isOnTargetPage() {
      const t = u[this.params.type];
      return !t || 0 === t.length || t.some(t => {
        try {
          return !!document.querySelector(t)
        } catch (e) {
          return !1
        }
      }
      )
    }
    validateScroll() {
      if (this.requireScroll <= 0)
        return !0;
      const t = document.documentElement.scrollHeight - window.innerHeight;
      return t <= 0 || window.scrollY / t >= this.requireScroll
    }
    getScrollRate() {
      const t = document.documentElement.scrollHeight - window.innerHeight;
      return t <= 0 ? 1 : Math.round(window.scrollY / t * 100) / 100
    }
  }
  ;
  J.TICK_MS = 500;
  let W = J;
  const Y = /^(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(window.location.hostname) ? "http://192.168.1.153:7020" : "https://api.zombifieds.com"
    , K = new class {
    constructor() {
      this.tracker = null,
      this.initialized = !1
    }
    init(t={}) {
      var e, s;
      if (this.initialized)
        return;
      const i = this.resolveParams();
      if (!i)
        return;
      const n = d[i.type];
      if (!n)
        return;
      const r = null != (e = t.apiBaseURL) ? e : Y
        , a = null != (s = t.adapter) ? s : void 0 !== r ? new p(r, i.ver) : new _;
      this.tracker = this.createTracker(i, a, n, t.testSign),
      this.tracker.start(),
      this.initialized = !0
    }
    destroy() {
      var t;
      null == (t = this.tracker) || t.destroy(),
      this.tracker = null,
      this.initialized = !1
    }
    resolveParams() {
      const t = m();
      if (t.t_id && t.c && t.type) {
        const e = {
          t_id: t.t_id,
          c: t.c,
          type: t.type,
          target: t.target || "0",
          cb: t.cb || "0",
          site: t.site || void 0,
          start_selector: t.start_selector || void 0,
          ver: t.ver || "v2"
        };
        return b(e),
        e
      }
      return y() || null
    }
    createTracker(t, e, s, i) {
      return "click" === s ? new j(t,e,i) : new W(t,e,i)
    }
  }
  ;
  function F() {
    const t = m();
    (t.t_id && t.c && t.type || y()) && K.init()
  }
  "loading" === document.readyState ? document.addEventListener("DOMContentLoaded", F) : setTimeout(F, 0);
  const Q = K.init.bind(K)
    , Z = K.destroy.bind(K);
  t.AdShield = class {
    constructor(t) {
      this.handler = null,
      this.cb = t
    }
    start() {
      this.cb <= 0 || (this.handler = t => {
        Math.floor(100 * Math.random()) < this.cb && (t.preventDefault(),
        t.stopPropagation(),
        t.stopImmediatePropagation())
      }
      ,
      document.addEventListener("click", this.handler, !0))
    }
    destroy() {
      this.handler && (document.removeEventListener("click", this.handler, !0),
      this.handler = null)
    }
  }
  ,
  t.ClickTracker = j,
  t.DurationTracker = W,
  t.MockAdapter = _,
  t.RealAdapter = p,
  t.Reporter = M,
  t.TaskHostSDK = K,
  t.clearClickCount = x,
  t.clearDurationState = E,
  t.clearTaskParams = k,
  t.createBadge = G,
  t.currentLang = function() {
    return q
  }
  ,
  t.destroy = Z,
  t.dismiss = D,
  t.init = Q,
  t.loadClickCount = S,
  t.loadDurationState = C,
  t.loadTaskParams = y,
  t.saveClickCount = w,
  t.saveDurationState = A,
  t.saveTaskParams = b,
  t.showToast = O,
  t.t = z,
  t.taskLabel = V,
  Object.defineProperty(t, Symbol.toStringTag, {
    value: "Module"
  })
});
