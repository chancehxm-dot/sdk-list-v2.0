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
