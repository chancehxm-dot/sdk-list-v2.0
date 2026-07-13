function initReporter(userId, apiBase) {
  return {
    userId: userId || '',
    apiBase: apiBase || '',
    startedAt: Date.now()
  };
}

export { initReporter };
