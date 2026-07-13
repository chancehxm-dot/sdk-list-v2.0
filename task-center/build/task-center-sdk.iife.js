var TaskCenter = (function (exports) {
  'use strict';

  const DEFAULT_API_BASE = 'https://api.example.com';
  const DEFAULT_CURRENCY = 'USD';
  const DEFAULT_CURRENCY_NAME = 'US Dollar';
  const DEFAULT_HEADER_TEXT = 'Task Center';
  const DEFAULT_BRIDGE_URL = 'https://bridge.example.com';
  const DEFAULT_SECRET_KEY = 'test';
  const DEFAULT_TIMEOUT = 30000;

  function getUrlParam(name) {
    if (typeof window === 'undefined' || !window.location) {
      return '';
    }

    const params = new URLSearchParams(window.location.search);
    return params.get(name) || '';
  }

  function normalizeOptions(config) {
    return {
      mode: config.mode || 'prod',
      userId: config.userId || getUrlParam('userId') || getUrlParam('id') || 'anonymous',
      apiBase: config.apiBase || config.baseUrl || DEFAULT_API_BASE,
      currency: config.currency || DEFAULT_CURRENCY,
      currencyName: config.currencyName || DEFAULT_CURRENCY_NAME,
      exchangeRate: config.exchangeRate || 1,
      headerText: config.headerText || DEFAULT_HEADER_TEXT,
      bridgeUrl: config.bridgeUrl || DEFAULT_BRIDGE_URL,
      secretKey: config.secretKey || DEFAULT_SECRET_KEY,
      container: config.container || null,
      containerId: config.containerId || null,
      injectCss: config.injectCss !== false,
      reporter: config.reporter || null,
      timeout: config.timeout || DEFAULT_TIMEOUT
    };
  }

  function assign(target, source) {
    const result = target || {};
    if (!source) {
      return result;
    }

    Object.keys(source).forEach(function(key) {
      result[key] = source[key];
    });

    return result;
  }

  function RealAdapter(baseUrl, secretKey, mode) {
    this.baseUrl = baseUrl || '';
    this.secretKey = secretKey || '';
    this.mode = mode || 'prod';
  }

  RealAdapter.prototype.request = function(method, path, payload) {
    return Promise.resolve({
      ok: true,
      method: method || 'GET',
      path: path || '/',
      payload: payload || {},
      baseUrl: this.baseUrl,
      secretKey: this.secretKey,
      mode: this.mode
    });
  };

  function injectStyles(force) {
    if (typeof document === 'undefined') {
      return false;
    }

    if (force === false) {
      return false;
    }

    var existing = document.getElementById('task-center-sdk-style');
    if (existing) {
      return existing;
    }

    var style = document.createElement('style');
    style.id = 'task-center-sdk-style';
    style.textContent = '.task-center-sdk-root { font-family: Arial, sans-serif; }';
    document.head.appendChild(style);
    return style;
  }

  var container = null;

  function ensureContainer(containerTarget) {
    if (typeof containerTarget === 'string') {
      return document.querySelector(containerTarget);
    }

    return containerTarget || null;
  }

  function renderApp(state, target) {
    var root = document.createElement('div');
    root.className = 'task-center-sdk-root';
    root.setAttribute('data-task-center-root', 'true');
    root.innerHTML = '<div><strong>' + (state.headerText || DEFAULT_HEADER_TEXT) + '</strong></div>';
    target.innerHTML = '';
    target.appendChild(root);
  }

  function init(config) {
    var options = normalizeOptions(config || {});
    var containerId = options.containerId || options.container;
    var containerTarget = ensureContainer(containerId);

    if (!containerTarget) {
      throw new Error('TaskCenter init requires a valid container or containerId');
    }

    var userId = options.userId || getUrlParam('userId') || getUrlParam('id') || 'anonymous';
    var apiBase = options.apiBase || options.baseUrl || options.apiBase;
    var mode = options.mode || 'prod';
    var adapterInstance = new RealAdapter(apiBase, DEFAULT_SECRET_KEY, mode);
    injectStyles(options.injectCss);

    container = containerTarget;
    var state = assign({}, options);
    state.userId = userId;
    state.adapter = adapterInstance;
    state.headerText = options.headerText || DEFAULT_HEADER_TEXT;
    state.timeout = options.timeout || DEFAULT_TIMEOUT;

    renderApp(state, container);
    return state;
  }

  function onBrowserClose() {
    if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
      window.dispatchEvent(new CustomEvent('taskcenter:browser-close'));
    }
  }

  function refresh() {
    if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
      window.dispatchEvent(new CustomEvent('taskcenter:refresh'));
    }
  }

  function reload() {
    if (typeof window !== 'undefined' && window.location && window.location.reload) {
      window.location.reload();
    }
  }

  function destroy() {
    if (container && container.innerHTML) {
      container.innerHTML = '';
    }

    container = null;
  }

  const TaskCenter = {
    init,
    onBrowserClose,
    refresh,
    reload,
    destroy
  };

  if (typeof window !== 'undefined') {
    window.TaskCenter = TaskCenter;
  }

  exports.TaskCenter = TaskCenter;
  exports.default = TaskCenter;
  exports.destroy = destroy;
  exports.init = init;
  exports.onBrowserClose = onBrowserClose;
  exports.refresh = refresh;
  exports.reload = reload;

  Object.defineProperty(exports, '__esModule', { value: true });

  return exports;

})({});
