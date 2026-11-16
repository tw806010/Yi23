import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// The site is Traditional Chinese only: i18n.js keeps the small API app.js uses and never loads locale files.
const i18nSource = fs.readFileSync('i18n.js', 'utf8');
const i18nContext = { window: {}, Intl };
vm.runInNewContext(i18nSource, i18nContext, { filename: 'i18n.js' });
const i18n = i18nContext.window.Yi23I18n;
await i18n.ready;
assert.equal(i18n.locale, 'zh-TW');
assert.equal(i18n.t('回報問題'), '回報問題');
assert.equal(i18n.t('產生時間：{time}', { time: '2026/11/16' }), '產生時間：2026/11/16');
assert.equal(i18n.setTool('ems'), 'zh-TW');
assert.equal(i18n.currentTool, 'ems');
assert.ok(i18n.formatDate(new Date('2026-11-03T12:00:00Z')).length > 0);
assert.ok(!/localStorage|yi23-locale|fetch\(|locales\//.test(i18nSource), 'i18n.js no longer stores a language or loads locale files');
assert.ok(!fs.existsSync('locales'), 'locale files are removed');

const html = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const serviceWorker = fs.readFileSync('service-worker.js', 'utf8');
assert.ok(html.search(/src="i18n\.js(?:\?v=\d+)?"/) < html.search(/src="app\.js(?:\?v=\d+)?"/), 'i18n manager must load before app.js');
const cacheVersion = serviceWorker.match(/medical-123-v(\d+)/)?.[1];
for (const asset of ['style.css', 'i18n.js', 'app.js']) {
  assert.ok(html.includes(`"${asset}?v=${cacheVersion}"`), `index.html loads ${asset} with the current cache version`);
  assert.ok(serviceWorker.includes(`'./${asset}?v=${cacheVersion}'`), `service worker precaches the versioned ${asset}`);
}
assert.ok(html.includes('Copyright © 2026 魏啟軒. All rights reserved.'), 'homepage footer includes the requested copyright notice');
const emsCard = html.indexOf('id="emsStartButton"');
assert.ok(html.indexOf('id="gcsStartButton"') < emsCard && emsCard < html.indexOf('更多健康工具即將推出'), 'EMS entry must sit between GCS and coming soon');
assert.match(html, /\.ems-menu-grid, \.ems-info-grid \{ grid-template-columns: 1fr; \}/, 'EMS cards become single-column on mobile');
assert.match(html, /\.ems-flow \{ grid-template-columns: 1fr; \}/, 'EMS flow becomes single-column on narrow screens');
for (const pageId of ['emsOverviewPage', 'emsAmbulancePage', 'emsEmtPage']) assert.ok(html.includes(`id="${pageId}"`), `EMS subpage exists: ${pageId}`);
assert.match(app, /emsStartButton\.addEventListener\('click', startEms\)/, 'EMS entry opens the EMS hub');
assert.match(app, /showEmsPage\(emsPages\[0\], event\.currentTarget\)/, 'EMS overview button opens its page');
assert.match(app, /showEmsPage\(emsPages\[1\], event\.currentTarget\)/, 'ambulance button opens its page');
assert.match(app, /showEmsPage\(emsPages\[2\], event\.currentTarget\)/, 'EMT button opens its page');
assert.match(app, /querySelectorAll\('\[data-ems-back\]'\)/, 'EMS detail pages return to the hub');
assert.match(app, /emsArea\.hidden = true/, 'global return-home flow hides the EMS tool');
const emsMarkup = html.match(/<section class="ems-area"[^>]*>[\s\S]*?(?=<section class="check-area" id="checkArea")/)?.[0] || '';
assert.ok(emsMarkup.includes('https://law.moj.gov.tw/'), 'EMS sources link to national regulations');
assert.ok(!/href="[^"]*(?:\.klfd\.|119\.tainan|county|city|救護資源)/i.test(emsMarkup), 'EMS content does not link to local resource directories');
assert.ok(!serviceWorker.includes('locales/'), 'service worker no longer precaches locale files');
for (const path of [...serviceWorker.matchAll(/'\.\/([^'?]+)(?:\?v=\d+)?'/g)].map(match => match[1]).filter(Boolean)) {
  assert.ok(fs.existsSync(path), `${path} exists for precache`);
}
assert.match(serviceWorker, /medical-123-v16/);
const versionDates = [...html.matchAll(/<section class="version-day"><h3>(\d{4}-\d{2}-\d{2})<\/h3>/g)].map(match => match[1]);
assert.ok(versionDates.length > 1, 'version history lists its dates');
assert.deepEqual(versionDates, [...versionDates].sort().reverse(), 'version history lists the newest date first');
assert.match(html, /<html lang="zh-Hant-TW">/, 'page language is zh-Hant-TW');
assert.ok(!/languageSelect|languageNotice|language-select|language-notice|data-no-translate/.test(html), 'no language menu or translation markers remain');
assert.ok(!/簡體中文|简体中文|English（|英語版本/.test(html), 'no language options or language notes in the version history');
assert.ok(!/data-no-translate|i18n\.locale/.test(app), 'app.js has no language branches');
assert.ok(!html.includes('語言偏好') && html.includes('本工具不會在您的瀏覽器保存您輸入的資料。'), 'privacy note no longer mentions a saved language preference');
assert.ok(html.includes('不構成醫療建議或診斷'), 'terms page states it is not medical advice');
assert.ok(html.includes('不會上傳或儲存到作者的伺服器'), 'terms page includes the privacy statement');
assert.ok(!fs.readdirSync('.').some(file => file.toLowerCase().endsWith('.pdf')), 'third-party reference PDFs are not published from the site root');


class MockElement {
  constructor(id = '') { this.id = id; this.hidden = true; this.value = ''; this.style = {}; this.handlers = {}; this.focused = false; this.scrolls = 0; }
  addEventListener(type, handler) { this.handlers[type] = handler; }
  setAttribute(name, value) { this[`attr:${name}`] = String(value); }
  getAttribute(name) { return this[`attr:${name}`] ?? null; }
  append() {}
  querySelector(selector) { return this.children?.[selector] || new MockElement(`${this.id}:${selector}`); }
  querySelectorAll() { return []; }
  focus() { this.focused = true; }
  scrollIntoView() { this.scrolls += 1; }
  fire(type, event = {}) { this.handlers[type]?.({ currentTarget: this, target: this, preventDefault() {}, ...event }); }
}
const appElements = new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(([, id]) => [id, new MockElement(id)]));
for (const id of ['homePage']) appElements.get(id).hidden = false;
for (const id of ['homeButton', 'restartButton']) appElements.get(id).hidden = true;
const emsBackButtons = ['emsOverviewPage', 'emsAmbulancePage', 'emsEmtPage'].map(id => {
  const back = new MockElement(`${id}:back`);
  appElements.get(id).children = { '[data-ems-back]': back };
  return back;
});
const preventionBackButtons = ['bmiPage', 'glucosePage', 'hba1cPage'].map(id => {
  const back = new MockElement(`${id}:back`);
  appElements.get(id).children = { '[data-prevention-back]': back };
  return back;
});
const preventionBackButton = preventionBackButtons[0];
const acuteBackButtons = ['cadPage', 'strokeInfoPage'].map(id => {
  const back = new MockElement(`${id}:back`);
  appElements.get(id).children = { '[data-acute-back]': back };
  return back;
});
const backButtonsBySelector = { '[data-ems-back]': emsBackButtons, '[data-prevention-back]': preventionBackButtons, '[data-acute-back]': acuteBackButtons };
let selectedTool = 'home';
const appWindow = {
  Yi23I18n: { ready: Promise.resolve(), setTool(tool) { selectedTool = tool; }, t: text => text, formatDate: date => date.toISOString() },
  scrollTo() {}, addEventListener() {}
};
const appDocument = {
  querySelector(selector) { return appElements.get(selector.replace(/^#/, '')) || new MockElement(selector); },
  querySelectorAll(selector) { return backButtonsBySelector[selector] || []; },
  createElement(tag) { return new MockElement(tag); },
  body: new MockElement('body'),
  addEventListener() {}
};
const appContext = { window: appWindow, document: appDocument, navigator: {}, console, Intl, Date, Number, Math, Promise };
const appStartup = vm.runInNewContext(fs.readFileSync('app.js', 'utf8'), appContext, { filename: 'app.js' });
await appStartup;
appElements.get('emsStartButton').fire('click');
assert.equal(selectedTool, 'ems');
assert.equal(appElements.get('emsArea').hidden, false);
assert.equal(appElements.get('homePage').hidden, true);
assert.equal(appElements.get('homeButton').hidden, false);
assert.equal(appElements.get('emsOverviewButton').focused, true);
appElements.get('emsOverviewButton').fire('click');
assert.equal(appElements.get('emsHub').hidden, true);
assert.equal(appElements.get('emsOverviewPage').hidden, false);
assert.equal(emsBackButtons[0].focused, true);
emsBackButtons[0].fire('click');
assert.equal(appElements.get('emsHub').hidden, false);
assert.equal(appElements.get('emsOverviewPage').hidden, true);
assert.equal(appElements.get('emsOverviewButton').focused, true);
appElements.get('emsAmbulanceButton').fire('click');
assert.equal(appElements.get('emsAmbulancePage').hidden, false);
emsBackButtons[1].fire('click');
assert.equal(appElements.get('emsHub').hidden, false);
appElements.get('emsEmtButton').fire('click');
assert.equal(appElements.get('emsEmtPage').hidden, false);
appElements.get('homeButton').fire('click');
assert.equal(selectedTool, 'home');
assert.equal(appElements.get('emsArea').hidden, true);
assert.equal(appElements.get('homePage').hidden, false);
appElements.get('termsButton').fire('click');
assert.equal(appElements.get('termsPage').hidden, false);
assert.equal(appElements.get('termsCloseButton').focused, true);
appElements.get('termsCloseButton').fire('click');
assert.equal(appElements.get('termsPage').hidden, true);
assert.equal(appElements.get('termsButton').focused, true);

assert.ok(html.indexOf('id="careHeading"') > html.indexOf('id="toolHeading"') && html.indexOf('id="preventionStartButton"') > html.indexOf('id="careHeading"'), 'prevention entry sits in the everyday-health section below the emergency tools');
assert.ok(html.includes('本工具適用 18 歲（含）以上成人'), 'BMI page states it is for adults only');
appElements.get('preventionStartButton').fire('click');
assert.equal(selectedTool, 'prevention');
assert.equal(appElements.get('preventionArea').hidden, false);
assert.equal(appElements.get('homePage').hidden, true);
assert.equal(appElements.get('bmiButton').focused, true);
appElements.get('bmiButton').fire('click');
assert.equal(appElements.get('preventionHub').hidden, true);
assert.equal(appElements.get('bmiPage').hidden, false);
assert.equal(preventionBackButton.focused, true);
const bmiInputs = { height: appElements.get('bmiHeight'), weight: appElements.get('bmiWeight'), waist: appElements.get('bmiWaist'), sex: appElements.get('bmiSex') };
function submitBmi(height, weight, waist = '', sex = ''){
  Object.assign(bmiInputs.height, { value: String(height) });
  Object.assign(bmiInputs.weight, { value: String(weight) });
  Object.assign(bmiInputs.waist, { value: String(waist) });
  Object.assign(bmiInputs.sex, { value: sex });
  appElements.get('bmiForm').fire('submit');
  return appElements.get('bmiResult');
}
// 170 cm: 69.1 kg → 23.9 (健康體重); 69.4 kg → 24.0 (體重過重); 78 kg → 27.0 (肥胖); 53.4 kg → 18.5 (健康體重).
for (const [weight, bmi, category] of [[69.1, '23.9', '健康體重'], [69.4, '24.0', '體重過重'], [78, '27.0', '肥胖'], [53.4, '18.5', '健康體重'], [53.1, '18.4', '體重過輕']]) {
  const result = submitBmi(170, weight);
  assert.equal(result.hidden, false);
  assert.ok(result.innerHTML.includes(`>${bmi}<small>`) && result.innerHTML.includes(`>${category}</span>`), `BMI ${bmi} is ${category}`);
}
assert.ok(submitBmi(170, 65).innerHTML.includes('健康體重約為 53.5～69.4 公斤'), 'BMI result shows the healthy weight range for the height');
assert.ok(submitBmi(170, 65, 92, 'male').innerHTML.includes('已達腹部肥胖標準'), 'male waist ≥ 90 cm is flagged');
assert.ok(submitBmi(160, 55, 79, 'female').innerHTML.includes('在理想範圍內'), 'female waist < 80 cm is fine');
submitBmi(170, 65, 85, '');
assert.equal(appElements.get('bmiError').hidden, false, 'waist without sex asks for sex');
assert.equal(appElements.get('bmiResult').hidden, true);
submitBmi(80, 65);
assert.equal(appElements.get('bmiError').textContent, '請輸入 100 至 250 公分之間的身高。');
assert.ok(submitBmi(170, 65).innerHTML.includes('30～39 歲每 5 年 1 次'), 'BMI result reflects the adult preventive care schedule from age 30');
preventionBackButton.fire('click');
assert.equal(appElements.get('preventionHub').hidden, false);
assert.equal(appElements.get('bmiPage').hidden, true);
assert.equal(appElements.get('bmiButton').focused, true, 'returning to the hub restores focus to the opener');

function submitReference(page, value){
  appElements.get(`${page}Value`).value = String(value);
  appElements.get(`${page}Form`).fire('submit');
  return appElements.get(`${page}Result`);
}
appElements.get('glucoseButton').fire('click');
assert.equal(appElements.get('glucosePage').hidden, false);
assert.equal(appElements.get('bmiPage').hidden, true);
assert.equal(preventionBackButtons[1].focused, true);
for (const [value, shown, name] of [[69, '69', '血糖偏低'], [70, '70', '正常範圍'], [99, '99', '正常範圍'], [100, '100', '糖尿病前期'], [125, '125', '糖尿病前期'], [126, '126', '達糖尿病參考值'], [99.6, '100', '糖尿病前期']]) {
  const result = submitReference('glucose', value);
  assert.equal(result.hidden, false);
  assert.ok(result.innerHTML.includes(`>${shown}<small>mg/dL`) && result.innerHTML.includes(`>${name}</span>`), `fasting glucose ${value} is ${name}`);
}
assert.ok(submitReference('glucose', 140).innerHTML.includes('單次結果不能確診'), 'diabetes-range glucose asks for lab confirmation');
submitReference('glucose', 5);
assert.equal(appElements.get('glucoseError').hidden, false);
assert.equal(appElements.get('glucoseResult').hidden, true);
preventionBackButtons[1].fire('click');
assert.equal(appElements.get('glucoseButton').focused, true);

appElements.get('hba1cButton').fire('click');
assert.equal(appElements.get('hba1cPage').hidden, false);
for (const [value, shown, name] of [[5.6, '5.6', '正常範圍'], [5.7, '5.7', '糖尿病前期'], [6.4, '6.4', '糖尿病前期'], [6.5, '6.5', '達糖尿病參考值'], [5.66, '5.7', '糖尿病前期']]) {
  const result = submitReference('hba1c', value);
  assert.equal(result.hidden, false);
  assert.ok(result.innerHTML.includes(`>${shown}<small>%`) && result.innerHTML.includes(`>${name}</span>`), `HbA1c ${value} is ${name}`);
}
submitReference('hba1c', 25);
assert.equal(appElements.get('hba1cError').textContent, '請輸入 3 至 20 % 之間的糖化血色素值。');
assert.ok(html.includes('立即撥打 119') && html.includes('15 公克含糖食物'), 'glucose page explains what to do for low blood sugar');
appElements.get('homeButton').fire('click');
assert.equal(selectedTool, 'home');
assert.equal(appElements.get('preventionArea').hidden, true);
assert.equal(appElements.get('homePage').hidden, false);

assert.ok(html.indexOf('id="fallStartButton"') > html.indexOf('id="preventionStartButton"') && html.indexOf('id="fallStartButton"') < html.indexOf('class="emergency-note"'), 'fall risk entry sits next to prevention in the everyday-health section');
assert.ok(html.includes('或服用抗凝血劑者撞到頭，請立即撥打 119。'), 'fall risk page shows the 119 reminder for people who already fell');
assert.ok(html.includes('STEADI-Brochure-StayIndependent-508.pdf') && html.includes('依 CDC 原文自行翻譯'), 'fall risk page cites the CDC checklist and notes the translation');
const fallEl = id => appElements.get(id);
function runFall(answers, { quick = false, proxy = false } = {}){
  fallEl('fallStartButton').fire('click');
  fallEl(quick ? 'fallQuickButton' : 'fallFullButton').fire('click');
  fallEl('fallProxy').checked = proxy;
  fallEl('fallBeginButton').fire('click');
  for (const answer of answers) fallEl(answer ? 'fallYesButton' : 'fallNoButton').fire('click');
  return fallEl('fallResult');
}
fallEl('fallStartButton').fire('click');
assert.equal(selectedTool, 'fall');
assert.equal(fallEl('fallArea').hidden, false);
assert.equal(fallEl('homePage').hidden, true);
assert.equal(fallEl('fallSetup').hidden, false);
assert.equal(fallEl('fallFullButton').focused, true);
fallEl('fallBeginButton').fire('click');
assert.equal(fallEl('fallQuiz').hidden, false);
assert.equal(fallEl('fallProgressText').textContent, '第 1／12 題');
assert.equal(fallEl('fallQuestion').textContent, '您過去一年內是否曾經跌倒？');
assert.equal(fallEl('fallPrevButton').textContent, '← 回到設定');
const noFall = Array(12).fill(false);
const withYes = (...indices) => noFall.map((answer, index) => indices.includes(index));
// Items 1–2 score 2, items 3–12 score 1; ≥ 4 points or a fall in the past year means higher risk.
for (const [answers, score, category] of [
  [noFall, 0, '目前風險較低'],
  [withYes(2, 3, 4), 3, '目前風險較低'],
  [withYes(2, 3, 4, 11), 4, '跌倒風險較高'],
  [withYes(1, 2), 3, '目前風險較低'],
  [withYes(0), 2, '跌倒風險較高'],
  [withYes(0, 1), 4, '跌倒風險較高'],
  [Array(12).fill(true), 14, '跌倒風險較高']
]) {
  const result = runFall(answers);
  assert.equal(result.hidden, false);
  assert.ok(result.innerHTML.includes(`>${score}<small>／14 分`) && result.innerHTML.includes(`>${category}</span>`), `fall checklist ${score} points is ${category}`);
}
assert.ok(runFall(withYes(0)).innerHTML.includes('雖然總分未達 4 分，但過去一年曾經跌倒'), 'a past fall alone is flagged even under 4 points');
assert.ok(runFall(withYes(9)).innerHTML.includes('請醫師或藥師評估'), 'a medicine answer suggests a medication review');
assert.ok(runFall(noFall).innerHTML.includes('@hpaicope'), 'result links the HPA six-abilities LINE account');
assert.equal(fallEl('fallQuiz').hidden, true);
// Going back keeps the earlier answer selected and lets it be changed.
runFall([]);
fallEl('fallYesButton').fire('click');
assert.equal(fallEl('fallProgressText').textContent, '第 2／12 題');
fallEl('fallPrevButton').fire('click');
assert.equal(fallEl('fallProgressText').textContent, '第 1／12 題');
assert.equal(fallEl('fallYesButton').getAttribute('aria-pressed'), 'true');
fallEl('fallNoButton').fire('click');
for (let index = 1; index < 12; index += 1) fallEl('fallNoButton').fire('click');
assert.ok(fallEl('fallResult').innerHTML.includes('>0<small>／14 分'), 'changing an answer on the way back updates the score');
runFall([], { proxy: true });
assert.equal(fallEl('fallQuestion').textContent, '他／她過去一年內是否曾經跌倒？', 'proxy mode asks in the third person');
fallEl('fallPrevButton').fire('click');
assert.equal(fallEl('fallSetup').hidden, false, 'back on the first question returns to the setup');
for (const [answers, category] of [[[false, false, false], '目前未發現明顯風險'], [[false, false, true], '建議進一步評估'], [[true, false, false], '建議進一步評估']]) {
  const result = runFall(answers, { quick: true });
  assert.equal(result.hidden, false);
  assert.ok(result.innerHTML.includes(`>${category}</span>`) && !result.innerHTML.includes('／14 分'), `quick fall screen ${answers} is ${category}`);
}
assert.equal(fallEl('fallProgressText').textContent, '第 3／3 題');
fallEl('homeButton').fire('click');
assert.equal(selectedTool, 'home');
assert.equal(fallEl('fallArea').hidden, true);
assert.equal(fallEl('homePage').hidden, false);

assert.ok(html.indexOf('id="acuteStartButton"') > html.indexOf('id="fallStartButton"') && html.indexOf('id="acuteStartButton"') < html.indexOf('class="emergency-note"'), 'acute-illness section sits below everyday health');
const acuteMarkup = html.match(/<section class="ems-area acute-area"[\s\S]*?(?=<section class="ems-area" id="emsArea")/)?.[0] || '';
for (const text of ['依 119 或醫師指示用藥，已有醫師處方的人依照醫囑使用', '依 119 線上指導做 CPR 和使用 AED']) assert.equal(acuteMarkup.split(text).length - 1, 2, `both acute pages say: ${text}`);
assert.ok(acuteMarkup.includes('越早到院，能選擇的治療越多') && !/\d+(?:\.\d+)?\s*小時/.test(acuteMarkup), 'stroke page explains the time window without naming hours');
assert.ok(acuteMarkup.includes('微笑、舉手、說你好') && acuteMarkup.includes('也可以請對方說「一」'), 'stroke page uses the HPA mnemonic and links it to the quick check');
assert.ok(acuteMarkup.includes('不要放血') && acuteMarkup.includes('更年期女性'), 'acute pages cover bloodletting and menopausal symptoms');
const acuteEl = id => appElements.get(id);
acuteEl('acuteStartButton').fire('click');
assert.equal(selectedTool, 'acute');
assert.equal(acuteEl('acuteArea').hidden, false);
assert.equal(acuteEl('homePage').hidden, true);
assert.equal(acuteEl('cadButton').focused, true);
acuteEl('cadButton').fire('click');
assert.equal(acuteEl('acuteHub').hidden, true);
assert.equal(acuteEl('cadPage').hidden, false);
assert.equal(acuteBackButtons[0].focused, true);
acuteBackButtons[0].fire('click');
assert.equal(acuteEl('acuteHub').hidden, false);
assert.equal(acuteEl('cadPage').hidden, true);
assert.equal(acuteEl('cadButton').focused, true, 'returning to the hub restores focus to the opener');
acuteEl('cadButton').fire('click');
acuteEl('cadBmiLink').fire('click');
assert.equal(selectedTool, 'prevention', 'the BMI link opens the prevention tool');
assert.equal(acuteEl('acuteArea').hidden, true);
assert.equal(acuteEl('preventionArea').hidden, false);
assert.equal(acuteEl('bmiPage').hidden, false);
preventionBackButton.fire('click');
assert.equal(acuteEl('bmiButton').focused, true);
acuteEl('homeButton').fire('click');
acuteEl('acuteStartButton').fire('click');
acuteEl('cadButton').fire('click');
acuteEl('cadGlucoseLink').fire('click');
assert.equal(acuteEl('glucosePage').hidden, false, 'the glucose link opens the fasting glucose page');
acuteEl('homeButton').fire('click');
acuteEl('acuteStartButton').fire('click');
acuteEl('strokeInfoButton').fire('click');
assert.equal(acuteEl('strokeInfoPage').hidden, false);
assert.equal(acuteBackButtons[1].focused, true);
acuteEl('strokeCheckLink').fire('click');
assert.equal(selectedTool, 'stroke', 'the stroke page links to the quick stroke check');
assert.equal(acuteEl('acuteArea').hidden, true);
assert.equal(acuteEl('checkArea').hidden, false);
acuteEl('homeButton').fire('click');
assert.equal(selectedTool, 'home');
assert.equal(acuteEl('checkArea').hidden, true);
acuteEl('acuteStartButton').fire('click');
acuteEl('strokeInfoButton').fire('click');
acuteEl('homeButton').fire('click');
assert.equal(acuteEl('acuteArea').hidden, true);
assert.equal(acuteEl('strokeInfoPage').hidden, true, 'returning home resets the acute pages');
assert.equal(acuteEl('acuteHub').hidden, false);

const menuMarkup = html.match(/<nav class="site-menu"[\s\S]*?<\/nav>/)?.[0] || '';
assert.ok(html.indexOf('id="menuButton"') < html.indexOf('id="homeBrand"'), 'menu button sits at the top-left, before the brand');
assert.deepEqual([...menuMarkup.matchAll(/<button class="site-menu-(?:group|item)[^"]*" id="[^"]+" type="button"[^>]*>([^<]+)</g)].map(match => match[1]), ['緊急工具', '中風快速檢查', '昏迷指數評估', '日常保健', 'BMI 計算', '對照飯前血糖', '對照糖化血色素', '跌倒風險自我檢測', '認識急症', '冠心症', '腦中風', '測量生命徵象', '急診檢傷分類', '認識 EMS'], 'menu lists the groups and items in the agreed order');
const menuEl = id => appElements.get(id);
const menuGroupState = () => ['Emergency', 'Care', 'Acute'].map(name => [menuEl(`menuGroup${name}`).getAttribute('aria-expanded'), menuEl(`menuList${name}`).hidden]);
const allCollapsed = [['false', true], ['false', true], ['false', true]];
menuEl('menuButton').fire('click');
assert.equal(menuEl('siteMenu').hidden, false);
assert.equal(menuEl('siteMenuBackdrop').hidden, false);
assert.equal(menuEl('menuButton').getAttribute('aria-expanded'), 'true');
assert.equal(appDocument.body.style.overflow, 'hidden', 'the page behind the open menu does not scroll');
assert.deepEqual(menuGroupState(), allCollapsed, 'all groups start collapsed');
assert.equal(menuEl('menuGroupEmergency').focused, true, 'opening the menu focuses the first group');
menuEl('menuGroupCare').fire('click');
assert.deepEqual(menuGroupState(), [['false', true], ['true', false], ['false', true]]);
menuEl('menuGroupAcute').fire('click');
assert.deepEqual(menuGroupState(), [['false', true], ['false', true], ['true', false]], 'opening one group collapses the others');
menuEl('menuGroupAcute').fire('click');
assert.deepEqual(menuGroupState(), allCollapsed, 'pressing an open group again collapses it');
menuEl('menuGroupEmergency').fire('click');
menuEl('siteMenuClose').fire('click');
assert.equal(menuEl('siteMenu').hidden, true);
assert.equal(menuEl('siteMenuBackdrop').hidden, true);
assert.equal(menuEl('menuButton').getAttribute('aria-expanded'), 'false');
assert.equal(appDocument.body.style.overflow, '');
menuEl('menuButton').focused = false;
menuEl('menuButton').fire('click');
assert.deepEqual(menuGroupState(), allCollapsed, 'reopening the menu starts with every group collapsed');
menuEl('siteMenuBackdrop').fire('click');
assert.equal(menuEl('siteMenu').hidden, true, 'tapping the backdrop closes the menu');
assert.equal(menuEl('menuButton').focused, true, 'closing the menu returns focus to the menu button');
const menuTargets = {
  menuStroke: ['stroke', 'checkArea'], menuGcs: ['gcs', 'gcsArea'], menuBmi: ['prevention', 'bmiPage'], menuGlucose: ['prevention', 'glucosePage'], menuHba1c: ['prevention', 'hba1cPage'], menuFall: ['fall', 'fallArea'],
  menuCad: ['acute', 'cadPage'], menuStrokeInfo: ['acute', 'strokeInfoPage'], menuVitals: ['vitals', 'vitalsArea'], menuTriage: ['triage', 'triageArea'], menuEms: ['ems', 'emsArea']
};
const toolAreas = ['checkArea', 'resultArea', 'gcsArea', 'gcsResult', 'vitalsArea', 'triageArea', 'emsArea', 'preventionArea', 'fallArea', 'acuteArea'];
const pageArea = { bmiPage: 'preventionArea', glucosePage: 'preventionArea', hba1cPage: 'preventionArea', cadPage: 'acuteArea', strokeInfoPage: 'acuteArea' };
for (const [id, [tool, page]] of Object.entries(menuTargets)) {
  menuEl('emsStartButton').fire('click');
  menuEl('emsOverviewButton').fire('click');
  menuEl('menuButton').fire('click');
  menuEl(id).fire('click');
  assert.equal(menuEl('siteMenu').hidden, true, `${id} closes the menu`);
  assert.equal(selectedTool, tool, `${id} opens the ${tool} tool`);
  assert.equal(menuEl(page).hidden, false, `${id} opens ${page}`);
  assert.equal(menuEl('homePage').hidden, true);
  assert.equal(menuEl('homeButton').hidden, false);
  assert.deepEqual(toolAreas.filter(area => !menuEl(area).hidden), [pageArea[page] || page], `${id} leaves only one tool on screen`);
  if (tool !== 'ems') assert.equal(menuEl('emsOverviewPage').hidden, true, `${id} closes the EMS page it was opened from`);
}
assert.equal(menuEl('emsHub').hidden, false, 'menu to EMS opens the EMS hub, not the last EMS page');
assert.equal(menuEl('emsOverviewPage').hidden, true);
menuEl('menuButton').fire('click');
menuEl('menuGlucose').fire('click');
assert.equal(menuEl('preventionHub').hidden, true);
preventionBackButtons[1].fire('click');
assert.equal(menuEl('preventionHub').hidden, false, 'back from a page opened by the menu returns to the prevention hub');
assert.equal(menuEl('glucoseButton').focused, true);
menuEl('homeButton').fire('click');
assert.equal(menuEl('homePage').hidden, false);

console.log('zh-TW only, EMS, prevention, fall-risk, acute-illness and menu smoke tests passed: no language menu, EMS, prevention, acute-illness and side-menu navigation, BMI, fasting glucose and HbA1c categories, fall checklist scoring, unique pages, and PWA asset paths.');
