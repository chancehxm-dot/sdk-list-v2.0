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

export { RealAdapter };
