(function (global) {
  // The site is Traditional Chinese only. This keeps the small API app.js uses: ready, t, setTool, formatDate, locale.
  let activeTool = 'home';
  const dateFormat = new Intl.DateTimeFormat('zh-TW', { dateStyle: 'short', timeStyle: 'short' });

  function t(text, params = {}) {
    let result = String(text);
    for (const [name, value] of Object.entries(params || {})) {
      result = result.replaceAll(`{${name}}`, String(value));
    }
    return result;
  }
  function setTool(tool) {
    activeTool = tool;
    return 'zh-TW';
  }
  function formatDate(date) {
    return dateFormat.format(date);
  }

  global.Yi23I18n = {
    ready: Promise.resolve(true),
    t,
    setTool,
    formatDate,
    get locale() { return 'zh-TW'; },
    get currentTool() { return activeTool; }
  };
})(window);
