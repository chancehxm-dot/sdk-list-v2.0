import { DEFAULT_SECRET_KEY, DEFAULT_HEADER_TEXT, DEFAULT_TIMEOUT } from './constants.js';
import { getUrlParam, normalizeOptions, assign } from './utils.js';
import { RealAdapter } from './adapter.js';
import { initReporter } from './reporter.js';
import { initStorage } from './storage.js';
import { injectStyles } from './ui.js';

var container = null;
var adapter = null;

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

  adapter = adapterInstance;
  initReporter(userId, apiBase);
  initStorage();
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
  adapter = null;
}

export { init, onBrowserClose, refresh, reload, destroy };
