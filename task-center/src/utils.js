import {
  DEFAULT_API_BASE,
  DEFAULT_BRIDGE_URL,
  DEFAULT_CURRENCY,
  DEFAULT_CURRENCY_NAME,
  DEFAULT_HEADER_TEXT,
  DEFAULT_SECRET_KEY,
  DEFAULT_TIMEOUT
} from './constants.js';

export function getUrlParam(name) {
  if (typeof window === 'undefined' || !window.location) {
    return '';
  }

  const params = new URLSearchParams(window.location.search);
  return params.get(name) || '';
}

export function normalizeOptions(config) {
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

export function assign(target, source) {
  const result = target || {};
  if (!source) {
    return result;
  }

  Object.keys(source).forEach(function(key) {
    result[key] = source[key];
  });

  return result;
}
