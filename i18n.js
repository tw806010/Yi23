(function (global) {
  const LOCALE_FILES = {
    'zh-TW': './locales/zh-TW.json',
    'zh-CN': './locales/zh-CN.json',
    en: './locales/en.json'
  };
  const TOOL_LOCALES = Object.freeze({
    home: ['zh-TW', 'zh-CN', 'en'],
    stroke: ['zh-TW', 'zh-CN', 'en'],
    gcs: ['zh-TW', 'zh-CN', 'en'],
    vitals: ['zh-TW', 'zh-CN', 'en'],
    triage: ['zh-TW', 'zh-CN', 'en'],
    about: ['zh-TW', 'zh-CN', 'en'],
    versionHistory: ['zh-TW', 'zh-CN', 'en'],
    ems: ['zh-TW'],
    prevention: ['zh-TW'],
    fall: ['zh-TW'],
    acute: ['zh-TW']
  });
  // Locales open to users site-wide. Add 'zh-CN' or 'en' back (and drop the 準備中 label in index.html) to reopen them.
  const ENABLED_LOCALES = Object.freeze(['zh-TW']);
  const bundles = {};
  const originalTextNodes = new WeakMap();
  const originalAttributes = new WeakMap();
  const localeSelect = document.querySelector('#languageSelect');
  const languageNotice = document.querySelector('#languageNotice');
  const savedLocale = readSavedLocale();
  // A saved choice of a closed locale falls back quietly; it stays in storage for when that locale reopens.
  let preferredLocale = LOCALE_FILES[savedLocale] && ENABLED_LOCALES.includes(savedLocale) ? savedLocale : 'zh-TW';
  let activeLocale = 'zh-TW';
  let activeTool = 'home';
  let englishExactMap = new Map();

  function readSavedLocale() {
    try { return localStorage.getItem('yi23-locale'); }
    catch { return null; }
  }
  function savePreferredLocale(locale) {
    preferredLocale = locale;
    try { localStorage.setItem('yi23-locale', locale); }
    catch { /* Language selection still works for this visit. */ }
  }
  function hasMessage(messages, key) {
    return Object.prototype.hasOwnProperty.call(messages || {}, key);
  }
  function translate(text, locale = activeLocale) {
    text = String(text);
    const bundle = bundles[locale];
    const messages = bundle?.messages || {};
    const messageId = bundle?.legacyKeys?.[text] || text;
    let result;
    if (hasMessage(messages, messageId)) result = messages[messageId];
    else if (locale === 'zh-CN') result = simplifyChinese(text, bundle);
    else if (locale === 'en') result = englishText(text);
    else result = text;
    return String(result);
  }
  function t(key, params = {}, locale = activeLocale) {
    let result = translate(key, locale);
    for (const [name, value] of Object.entries(params || {})) {
      result = result.replaceAll(`{${name}}`, String(value));
    }
    return result;
  }
  function simplifyChinese(text, bundle = bundles['zh-CN']) {
    let result = text;
    for (const [traditional, simplified] of Object.entries(bundle?.phraseOverrides || {})) {
      result = result.replaceAll(traditional, simplified);
    }
    const characters = bundle?.characters || {};
    return [...result].map(character => characters[character] || character).join('');
  }
  function englishText(text) {
    const trimmed = text.trim();
    if (trimmed !== text) {
      if (!trimmed) return text;
      const start = text.indexOf(trimmed);
      return text.slice(0, start) + englishText(trimmed) + text.slice(start + trimmed.length);
    }
    if (englishExactMap.has(text)) return englishExactMap.get(text);
    const step = text.match(/^步驟 (\d+)／(\d+)$/);
    if (step) return `Step ${step[1]} of ${step[2]}`;
    const gcsStep = text.match(/^GCS 步驟 (\d+)／(\d+)$/);
    if (gcsStep) return `GCS · Step ${gcsStep[1]} of ${gcsStep[2]}`;
    const progress = text.match(/^([FASEVM])｜(.+)$/);
    if (progress) return `${progress[1]} | ${englishExactMap.get(progress[2]) || progress[2]}`;
    const wait = text.match(/^可能等候時間：(立即處理|\d+ 分鐘)$/);
    if (wait) return `Estimated wait: ${wait[1] === '立即處理' ? 'Immediate' : wait[1].replace(' 分鐘', ' minutes')}`;
    const score = text.match(/^GCS (\d+) 分$/);
    if (score) return `GCS score: ${score[1]}`;
    const points = text.match(/^(\d+) 分$/);
    if (points) return `${points[1]} points`;
    const heartRate = text.match(/^清醒心跳參考：(\d+) 至 (\d+) 次／分鐘$/);
    if (heartRate) return `Awake heart rate reference: ${heartRate[1]}–${heartRate[2]} bpm`;
    const respirationRate = text.match(/^呼吸參考：(\d+) 至 (\d+) 次／分鐘$/);
    if (respirationRate) return `Respiratory rate reference: ${respirationRate[1]}–${respirationRate[2]} breaths/min`;
    const temperatureReference = text.match(/^(額溫|耳溫|腋溫|肛溫)參考：([\d.]+) 至 ([\d.]+) °C$/);
    if (temperatureReference) return `${englishExactMap.get(temperatureReference[1]) || temperatureReference[1]} reference: ${temperatureReference[2]}–${temperatureReference[3]} °C`;
    if (text.startsWith('收縮壓 ') || text.startsWith('來源列示收縮壓 ')) return englishBloodPressureReference(text);
    const highTemperature = text.match(/^高於 (額溫|耳溫|腋溫|肛溫) 資料參考範圍$/);
    if (highTemperature) return `Above the ${englishExactMap.get(highTemperature[1]) || highTemperature[1]} reference range`;
    const imageTemperature = text.match(/^[\d.]+ °C（(額溫|耳溫|腋溫|肛溫)；參考 [\d.]+～[\d.]+ °C）$/);
    if (imageTemperature) return englishVitalValue('體溫', text);
    const imagePulse = text.match(/^\d+(?:\.\d+)? 次／分鐘；清醒心跳參考：\d+ 至 \d+ 次／分鐘$/);
    if (imagePulse) return englishVitalValue('脈搏', text);
    const imageRespiration = text.match(/^\d+(?:\.\d+)? 次／分鐘；呼吸參考：\d+ 至 \d+ 次／分鐘$/);
    if (imageRespiration) return englishVitalValue('呼吸', text);
    const imageBloodPressure = text.match(/^(?:\d+／\d+ mmHg|未輸入完整數值)；(?:來源列示)?收縮壓 .+$/);
    if (imageBloodPressure) return englishVitalValue('血壓', text.replace(/^未輸入完整數值；/, 'Incomplete; '));
    const agePreview = text.match(/^資料卡年齡分類：(.*)$/);
    if (agePreview) return `Age group: ${englishText(agePreview[1])}`;
    const finding = text.match(/^您在「(.+)」發現異常。中風治療分秒必爭，請立即尋求緊急醫療協助。$/);
    if (finding) {
      const items = finding[1].split('、').map(item => {
        const match = item.match(/^([FAS])／(.+)$/);
        return match ? `${match[1]} · ${englishExactMap.get(match[2]) || match[2]}` : item;
      });
      return `Abnormal finding${items.length === 1 ? '' : 's'}: ${items.join('; ')}. Stroke is time-critical. Call 119 immediately for emergency care.`;
    }
    const strokeRows = text.split('；');
    if (strokeRows.length > 1 && strokeRows.every(row => /^.+：(發現異常|無法判斷|看起來正常)$/.test(row))) {
      return strokeRows.map(row => { const [label, value] = row.split('：'); return `${englishExactMap.get(label) || label}: ${englishExactMap.get(value) || value}`; }).join('; ');
    }
    if (text.startsWith('發現異常：') && text.endsWith('；請立即撥打 119。')) {
      const names = text.slice('發現異常：'.length, -'；請立即撥打 119。'.length).split('、').map(item => {
        const match = item.match(/^([FAS])／(.+)$/);
        return match ? `${match[1]} · ${englishExactMap.get(match[2]) || match[2]}` : item;
      });
      return `Abnormal finding${names.length === 1 ? '' : 's'}: ${names.join('; ')}. Call 119 immediately.`;
    }
    if (text.includes('；')) {
      const parts = text.replace(/。$/, '').split('；');
      if (parts.every(part => /^(體溫|脈搏|呼吸|血壓)：/.test(part))) return parts.map(part => englishText(part)).join(' · ') + (text.endsWith('。') ? '.' : '');
    }
    const vitalPattern = text.match(/^(年齡|量測時間|體溫|脈搏|呼吸|血壓)：(.*)$/);
    if (vitalPattern) return `${englishExactMap.get(vitalPattern[1]) || vitalPattern[1]}: ${englishVitalValue(vitalPattern[1], vitalPattern[2])}`;
    if (text.startsWith('您在「') && text.includes('」發現異常。')) return text;
    return text;
  }
  function englishVitalValue(label, value) {
    if (englishExactMap.has(value)) return englishExactMap.get(value);
    const site = '(額溫|耳溫|腋溫|肛溫)';
    let match;
    if (label === '年齡') return englishText(value);
    if (label === '量測時間') return value;
    if (label === '體溫') {
      match = value.match(new RegExp(`^([\\d.]+) °C（${site}）$`));
      if (match) return `${match[1]} °C (${englishExactMap.get(match[2]) || match[2]})`;
      match = value.match(new RegExp(`^([\\d.]+) °C（${site}；參考 ([\\d.]+)～([\\d.]+) °C）$`));
      if (match) return `${match[1]} °C (${englishExactMap.get(match[2]) || match[2]}; reference ${match[3]}–${match[4]} °C)`;
    }
    match = value.match(/^(\d+(?:\.\d+)?) 次／分鐘(?:；清醒心跳參考：(\d+) 至 (\d+) 次／分鐘)?$/);
    if (label === '脈搏' && match) return `${match[1]} bpm${match[2] ? ` · Awake heart rate reference: ${match[2]}–${match[3]} bpm` : ''}`;
    match = value.match(/^(\d+(?:\.\d+)?) 次／分鐘(?:；呼吸參考：(\d+) 至 (\d+) 次／分鐘)?$/);
    if (label === '呼吸' && match) return `${match[1]} breaths/min${match[2] ? ` · Respiratory rate reference: ${match[2]}–${match[3]} breaths/min` : ''}`;
    match = value.match(/^(\d+)／(\d+) mmHg(?:；(.+))?$/);
    if (label === '血壓' && match) return `${match[1]}/${match[2]} mmHg${match[3] ? ` · ${englishBloodPressureReference(match[3])}` : ''}`;
    match = value.match(/^(\d+)／(\d+) mmHg；(.+)$/);
    if (label === '血壓' && match) return `${match[1]}/${match[2]} mmHg · ${englishBloodPressureReference(match[3])}`;
    match = value.match(/^([\d.]+) °C（(額溫|耳溫|腋溫|肛溫)；參考 ([\d.]+)～([\d.]+) °C）$/);
    if (label === '體溫' && match) return `${match[1]} °C (${englishExactMap.get(match[2]) || match[2]}; reference ${match[3]}–${match[4]} °C)`;
    if (value.startsWith('Incomplete; ')) return `Incomplete · ${englishBloodPressureReference(value.slice('Incomplete; '.length))}`;
    if (value.startsWith('未輸入完整數值；')) return `Incomplete · ${englishBloodPressureReference(value.slice('未輸入完整數值；'.length))}`;
    if (value.startsWith('未輸入')) return 'Not entered';
    if (value.startsWith('有項目無法評估')) return englishExactMap.get('有項目無法評估，不計算總分') || value;
    return value;
  }
  function englishBloodPressureReference(value) {
    const match = value.match(/^(?:來源列示)?收縮壓 (\d+)～(\d+)／舒張壓 ?(約 )?(\d+)(?:～(\d+))? mmHg(?:；成人血壓另依國健署資料參考)?$/);
    if (!match) return englishExactMap.get(value) || value;
    const systolic = `${match[1]}–${match[2]}`;
    const diastolic = match[5] ? `${match[4]}–${match[5]}` : `${match[3] ? 'about ' : ''}${match[4]}`;
    const note = value.includes('成人血壓') ? '; see Health Promotion Administration guidance for adult blood pressure' : '';
    return `Reference: systolic ${systolic} / diastolic ${diastolic} mmHg${note}`;
  }
  function translateNode(node) {
    const parent = node.parentElement;
    if (!parent || parent.closest('[data-no-translate]')) return;
    if (!originalTextNodes.has(node)) originalTextNodes.set(node, node.nodeValue);
    node.nodeValue = t(originalTextNodes.get(node));
  }
  function translateElement(element) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) translateNode(walker.currentNode);
    for (const node of [element, ...element.querySelectorAll('*')]) {
      for (const attribute of ['placeholder', 'aria-label', 'title', 'alt']) {
        if (!node.hasAttribute?.(attribute)) continue;
        let values = originalAttributes.get(node);
        if (!values) { values = {}; originalAttributes.set(node, values); }
        if (!(attribute in values)) values[attribute] = node.getAttribute(attribute);
        node.setAttribute(attribute, t(values[attribute]));
      }
    }
  }
  function getAvailableLocales(tool = activeTool) {
    return [...(TOOL_LOCALES[tool] || ['zh-TW'])].filter(locale => !!bundles[locale] && ENABLED_LOCALES.includes(locale));
  }
  function setTool(tool) {
    activeTool = tool;
    const available = getAvailableLocales(tool);
    activeLocale = available.includes(preferredLocale) ? preferredLocale : (available.includes('zh-TW') ? 'zh-TW' : available[0] || 'zh-TW');
    applyLocale();
    if (languageNotice) {
      const isFallback = activeLocale !== preferredLocale;
      languageNotice.hidden = !isFallback;
      languageNotice.textContent = isFallback ? t('i18n.toolLocaleUnavailable', {}, preferredLocale) : '';
    }
    return activeLocale;
  }
  function setPreferredLocale(locale) {
    if (!getAvailableLocales().includes(locale)) {
      if (localeSelect) localeSelect.value = activeLocale;
      return false;
    }
    savePreferredLocale(locale);
    setTool(activeTool);
    return true;
  }
  function applyLocale() {
    document.documentElement.lang = activeLocale;
    document.title = t('醫二三｜緊急工具包：中風檢查、生命徵象與日常保健');
    translateElement(document.body);
    if (localeSelect) {
      localeSelect.value = activeLocale;
      const available = getAvailableLocales();
      for (const option of localeSelect.options) option.disabled = !available.includes(option.value);
    }
  }
  function formatDate(date) {
    const localeName = activeLocale === 'en' ? 'en-US' : activeLocale === 'zh-CN' ? 'zh-CN' : 'zh-TW';
    return new Intl.DateTimeFormat(localeName, { dateStyle: 'short', timeStyle: 'short' }).format(date);
  }
  async function initialize() {
    const loads = Object.entries(LOCALE_FILES).map(async ([locale, path]) => {
      try {
        const response = await fetch(path, { cache: 'no-cache' });
        if (!response.ok) throw new Error(`Could not load ${path}: ${response.status}`);
        const bundle = await response.json();
        if (bundle.locale !== locale || !bundle.messages) throw new Error(`Invalid locale file: ${path}`);
        bundles[locale] = bundle;
      } catch (error) { console.error(error); }
    });
    await Promise.all(loads);
    if (!bundles['zh-TW']) bundles['zh-TW'] = { locale: 'zh-TW', messages: {} };
    const legacyKeys = bundles['zh-TW'].legacyKeys || {};
    englishExactMap = new Map(Object.entries(legacyKeys).map(([source, messageId]) => [source, bundles.en?.messages?.[messageId] ?? source]));
    if (localeSelect) localeSelect.addEventListener('change', () => setPreferredLocale(localeSelect.value));
    setTool('home');
    new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) translateNode(node);
      else if (node.nodeType === Node.ELEMENT_NODE) translateElement(node);
    }))).observe(document.body, { childList: true, subtree: true });
    return true;
  }

  const manager = {
    ready: null,
    t,
    setTool,
    setLocale: setPreferredLocale,
    getAvailableLocales,
    formatDate,
    get locale() { return activeLocale; },
    get preferredLocale() { return preferredLocale; },
    get currentTool() { return activeTool; }
  };
  manager.ready = initialize();
  global.Yi23I18n = manager;
})(window);
