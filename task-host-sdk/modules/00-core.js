/**
 * 00-核心工具
 *
 * 提供对象操作的基础函数，所有其他模块都依赖此模块。
 * - extend: 浅拷贝属性
 * - inherit: 原型链继承（模拟 ES6 extends）
 */
;(function(M) {
    "use strict";

    /**
     * 将 source 的可枚举属性拷贝到 target（浅拷贝）
     *
     * @param   {Object} target - 目标对象
     * @param   {Object} source - 源对象
     * @returns {Object} 合并后的 target
     */
    function extend(target, source) {
        var key;
        for (key in source) {
            if (Object.prototype.hasOwnProperty.call(source, key)) {
                target[key] = source[key];
            }
        }
        return target;
    }

    /**
     * 原型链继承
     *
     * 用法：inherit(Child, Parent)
     * 之后 Child.prototype 会指向 Parent.prototype 的新实例，
     * 同时 constructor 指回 Child 自身。
     *
     * @param {Function} Child  - 子类构造函数
     * @param {Function} Parent - 父类构造函数
     */
    function inherit(Child, Parent) {
        Child.prototype = Object.create(Parent.prototype);
        Child.prototype.constructor = Child;
    }

    /**
     * 将 arguments 类数组转为真正的数组
     * 用于处理可变参数函数
     *
     * @param   {Arguments} args - 函数的 arguments 对象
     * @returns {Array} 转换后的数组
     */
    function toArray(args) {
        return Array.prototype.slice.call(args);
    }

    // ---- 导出 ----
    M.extend  = extend;
    M.inherit = inherit;
    M.toArray = toArray;

})(window.__TaskHostSDK__ = window.__TaskHostSDK__ || {});
