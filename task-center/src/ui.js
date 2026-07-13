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

export { injectStyles };
