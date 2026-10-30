const steps = [
  { key: 'F', label: '臉部觀察', title: '請對方微笑或露齒。', instruction: '觀察左右臉部肌肉是否對稱，是否有一側嘴角下垂。', observe: '觀察重點：嘴角歪斜、單側臉部無力或表情明顯不對稱。', art: 'face' },
  { key: 'A', label: '手臂觀察', title: '請對方雙手平舉。', instruction: '請閉上眼睛，雙手向前平舉約 10 秒，觀察是否有一側下垂。', observe: '觀察重點：其中一隻手無法抬起，或較另一側明顯下垂。', art: 'arms' },
  { key: 'S', label: '說話觀察', title: '請對方說：「一」。', instruction: '觀察說話時的脣形與聲音；如情況允許，可再請對方重複簡短句子。', observe: '觀察重點：發音含糊、用詞錯誤、無法說話，或無法理解簡短指令。', art: 'speech' }
];
let current = 0;
let answers = [];
const checkArea = document.querySelector('#checkArea');
const resultArea = document.querySelector('#resultArea');
const testCard = document.querySelector('#testCard');
const homePage = document.querySelector('#homePage');
const triageStartButton = document.querySelector('#triageStartButton');
const cardStartButton = document.querySelector('#cardStartButton');
const restartButton = document.querySelector('#restartButton');
const homeButton = document.querySelector('#homeButton');
const homeBrand = document.querySelector('#homeBrand');
const bioButton = document.querySelector('#bioButton');
const bioPage = document.querySelector('#bioPage');
const bioCloseButton = document.querySelector('#bioCloseButton');
const versionButton = document.querySelector('#versionButton');
const versionPage = document.querySelector('#versionPage');
const versionCloseButton = document.querySelector('#versionCloseButton');
const gcsArea = document.querySelector('#gcsArea');
const gcsCard = document.querySelector('#gcsCard');
const gcsResult = document.querySelector('#gcsResult');
const gcsStartButton = document.querySelector('#gcsStartButton');
const triageArea = document.querySelector('#triageArea');
const vitalsArea = document.querySelector('#vitalsArea');
const vitalsStartButton = document.querySelector('#vitalsStartButton');
const vitalsForm = document.querySelector('#vitalsForm');
const vitalsResults = document.querySelector('#vitalsResults');
function wrapCanvasText(context, text, maxWidth){
  const lines = [];
  for(const paragraph of String(text).split('\n')){
    let line = '';
    for(const character of paragraph){
      const candidate = line + character;
      if(line && context.measureText(candidate).width > maxWidth){ lines.push(line); line = character; }
      else line = candidate;
    }
    lines.push(line || ' ');
  }
  return lines;
}
function saveResultPng(title, rows, fileName){
  const width = 1080;
  const margin = 72;
  const innerWidth = width - margin * 2;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if(!context) throw new Error('無法建立圖片');
  context.font = '32px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
  const preparedRows = rows.map(([label, value]) => ({ label, value: wrapCanvasText(context, `${label}：${value}`, innerWidth - 44) }));
  const rowHeights = preparedRows.map(row => Math.max(86, row.value.length * 48 + 34));
  const height = 285 + rowHeights.reduce((sum, rowHeight) => sum + rowHeight + 18, 0) + 165;
  canvas.width = width;
  canvas.height = height;
  context.fillStyle = '#f1f8fa';
  context.fillRect(0, 0, width, height);
  context.fillStyle = '#fffdf8';
  context.beginPath();
  context.roundRect(28, 28, width - 56, height - 56, 32);
  context.fill();
  context.fillStyle = '#f15b52';
  context.beginPath();
  context.roundRect(28, 28, width - 56, 190, 32);
  context.fill();
  context.fillRect(28, 155, width - 56, 63);
  context.fillStyle = '#ffffff';
  context.font = '800 25px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
  context.fillText('醫二三｜緊急工具包', margin, 88);
  context.font = '800 43px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
  context.fillText(title, margin, 157);
  let y = 245;
  preparedRows.forEach((row, index) => {
    const rowHeight = rowHeights[index];
    context.fillStyle = '#f6fbfc';
    context.strokeStyle = '#d8e7ed';
    context.lineWidth = 2;
    context.beginPath();
    context.roundRect(margin, y, innerWidth, rowHeight, 18);
    context.fill();
    context.stroke();
    context.fillStyle = '#294b63';
    context.font = '600 32px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
    row.value.forEach((line, lineIndex) => context.fillText(line, margin + 22, y + 53 + lineIndex * 48));
    y += rowHeight + 18;
  });
  context.fillStyle = '#5f7180';
  context.font = '25px "Noto Sans TC", "Microsoft JhengHei", sans-serif';
  context.fillText('本圖片由使用者在本機產生，供紀錄與溝通參考。', margin, height - 112);
  context.fillText('不能取代專業判斷；緊急狀況請立即撥打 119。', margin, height - 70);
  return new Promise((resolve, reject) => canvas.toBlob(blob => {
    if(!blob){ reject(new Error('PNG 圖片產生失敗')); return; }
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    resolve();
  }, 'image/png'));
}
function addPngButton(container, title, rows, fileName){
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'primary-button png-save-button';
  button.textContent = '儲存結果圖片';
  button.addEventListener('click', async () => {
    button.disabled = true;
    button.textContent = '正在製作 PNG…';
    try { await saveResultPng(title, rows, fileName); button.textContent = 'PNG 已下載'; }
    catch { button.textContent = '製作失敗，請再試一次'; }
    window.setTimeout(() => { button.disabled = false; button.textContent = '儲存結果圖片'; }, 2200);
  });
  container.append(button);
}
const art = type => {
  const common = '<svg viewBox="0 0 220 210" aria-hidden="true">';
  if(type === 'face') return common + '<path class="fill-shirt" d="M45 204c5-42 30-62 65-62s60 20 65 62Z"/><path class="fill-skin" d="M66 77c0-34 19-54 44-54s44 20 44 54v30c0 31-19 49-44 49s-44-18-44-49Z"/><path class="fill-hair" d="M64 85c-4-44 21-69 51-65 30 3 45 28 37 67-11-21-16-34-16-49-18 19-43 28-72 26Z"/><path fill="none" d="M81 89c7-4 14-4 20 0m19 0c7-4 14-4 20 0M88 117c9 2 18 2 26-1"/><path class="fill-yellow" d="M159 97c24 3 36 18 35 38-1 20-18 34-37 31"/><path fill="none" d="m165 130 10 10 16-22"/></svg>';
  if(type === 'arms') return common + '<path class="fill-shirt" d="M56 205c3-50 20-75 54-75s51 25 54 75Z"/><path class="fill-skin" d="M77 64c0-30 14-48 33-48s33 18 33 48v31c0 24-14 40-33 40S77 119 77 95Z"/><path class="fill-hair" d="M76 70c-1-39 25-58 51-46 16 7 20 27 16 43-11-12-16-23-17-36-12 18-30 27-50 28Z"/><path class="fill-skin" d="M69 146 27 100 15 111l43 62c7 10 20 7 23-2Z"/><path class="fill-skin" d="m151 146 42-46 12 11-43 62c-7 10-20 7-23-2Z"/><path fill="none" d="m40 113 13-12m127 12-13-12M94 82h1m29 0h1"/></svg>';
  return common + '<path class="fill-white" d="M49 57c0-24 20-42 45-42h33c25 0 44 18 44 42v44c0 25-19 43-44 43h-13l-30 28 4-28c-23-3-39-20-39-43Z"/><path class="fill-skin" d="M78 80c0-21 14-35 32-35s32 14 32 35v20c0 22-14 35-32 35S78 122 78 100Z"/><path class="fill-hair" d="M77 82c0-32 20-48 43-40 18 7 23 21 21 39-8-12-12-20-13-29-13 13-29 20-51 20Z"/><path fill="none" d="M95 103c9 7 20 7 29 0"/><path class="fill-yellow" d="M150 151c21 0 37 14 37 31s-16 22-31 18l-27 8 6-25c-6-7-8-16-5-23"/><path fill="none" d="M151 178h16"/></svg>';
};
function renderStep(){
  const step = steps[current];
  document.querySelector('#stepLabel').textContent = `步驟 ${current + 1}／3`;
  document.querySelector('#progressText').textContent = `${step.key}｜${step.label}`;
  document.querySelector('#progressBar').style.width = `${((current + 1) / 3) * 100}%`;
  testCard.innerHTML = `<div class="step-illustration">${art(step.art)}</div><div class="card-copy"><span class="step-pill">${step.key}｜${step.label}</span><h2>${step.title}</h2><p class="instruction">${step.instruction}</p>${step.key === 'S' ? '<span class="speech-word">一</span>' : ''}<p class="observe">${step.observe}</p><div class="choice-buttons"><button class="choice" type="button" data-value="normal">看起來正常</button><button class="choice abnormal" type="button" data-value="abnormal">發現異常</button><button class="choice" type="button" data-value="unknown">無法判斷</button></div></div>`;
  testCard.querySelectorAll('[data-value]').forEach(button => button.addEventListener('click', () => choose(button.dataset.value)));
}
function choose(value){
  answers.push({ ...steps[current], value });
  if(value === 'abnormal'){ showResult(true); return; }
  current += 1;
  if(current < steps.length) renderStep(); else showResult(false);
}
function showResult(isEmergency){
  checkArea.hidden = true;
  resultArea.hidden = false;
  restartButton.hidden = false;
  const abnormalities = answers.filter(answer => answer.value === 'abnormal').map(answer => `${answer.key}／${answer.label}`);
  const observedAt = new Intl.DateTimeFormat('zh-TW', { dateStyle: 'short', timeStyle: 'short' }).format(new Date());
  if(isEmergency){
    resultArea.innerHTML = `<article class="result-card"><div class="result-icon">!</div><h2>疑似中風徵象</h2><p>您在「${abnormalities.join('、')}」發現異常。中風治療分秒必爭，請立即尋求緊急醫療協助。</p><a class="call-button" href="tel:119">立即撥打 <b>119</b></a><div class="summary"><h3>聯絡救護人員前，請準備：</h3><ul><li>患者何時最後看起來正常，或症狀何時開始。</li><li>已觀察到的異常狀況：${abnormalities.join('、')}。</li><li>請勿自行開車前往，也不要自行服藥。</li></ul></div></article>`;
  } else {
    resultArea.innerHTML = `<article class="result-card safe-result"><div class="result-icon">✓</div><h2>本次未發現明顯異常</h2><p>若症狀持續、反覆出現，或您仍覺得不對勁，請不要等待，立即撥打 119 或就近就醫。</p><button class="primary-button" id="resultRestart" type="button">重新檢查</button></article>`;
    document.querySelector('#resultRestart').addEventListener('click', reset);
  }
  addPngButton(resultArea.querySelector('.result-card'), '中風快速檢查結果', [
    ['觀察時間', observedAt],
    ['臉部、手臂、說話觀察', answers.map(answer => `${answer.label}：${answer.value === 'abnormal' ? '發現異常' : answer.value === 'unknown' ? '無法判斷' : '看起來正常'}`).join('；')],
    ['發病或最後正常時間', '尚未記錄，請補充告知救護人員'],
    ['結果提醒', isEmergency ? `發現異常：${abnormalities.join('、')}；請立即撥打 119。` : '本次未發現明顯異常；若症狀持續或惡化，請立即就醫。']
  ], `中風快速檢查-${new Date().toISOString().slice(0, 16).replace('T', '-')}.png`);
  resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function reset(){ current = 0; answers = []; resultArea.hidden = true; checkArea.hidden = false; restartButton.hidden = true; homeButton.hidden = false; renderStep(); checkArea.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
function startCheck(){ homePage.hidden = true; vitalsArea.hidden = true; triageArea.hidden = true; checkArea.hidden = false; restartButton.hidden = false; homeButton.hidden = false; renderStep(); checkArea.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
function returnHome(){ current = 0; answers = []; checkArea.hidden = true; resultArea.hidden = true; gcsArea.hidden = true; gcsResult.hidden = true; vitalsArea.hidden = true; triageArea.hidden = true; homePage.hidden = false; restartButton.hidden = true; homeButton.hidden = true; window.scrollTo({ top: 0, behavior: 'smooth' }); }
function startTriage(){ homePage.hidden = true; vitalsArea.hidden = true; checkArea.hidden = true; resultArea.hidden = true; gcsArea.hidden = true; gcsResult.hidden = true; triageArea.hidden = false; restartButton.hidden = true; homeButton.hidden = false; triageArea.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
function startVitals(){ homePage.hidden = true; checkArea.hidden = true; resultArea.hidden = true; gcsArea.hidden = true; gcsResult.hidden = true; triageArea.hidden = true; vitalsArea.hidden = false; restartButton.hidden = true; homeButton.hidden = false; vitalsArea.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
triageStartButton.addEventListener('click', startTriage);
vitalsStartButton.addEventListener('click', startVitals);
cardStartButton.addEventListener('click', startCheck);
restartButton.addEventListener('click', reset);
homeButton.addEventListener('click', returnHome);
homeBrand.addEventListener('click', event => { if(!homePage.hidden) return; event.preventDefault(); returnHome(); });
bioButton.addEventListener('click', () => { bioPage.hidden = false; bioCloseButton.focus(); });
bioCloseButton.addEventListener('click', () => { bioPage.hidden = true; bioButton.focus(); });
bioPage.addEventListener('click', event => { if(event.target === bioPage) { bioPage.hidden = true; bioButton.focus(); } });
versionButton.addEventListener('click', () => { versionPage.hidden = false; versionCloseButton.focus(); });
versionCloseButton.addEventListener('click', () => { versionPage.hidden = true; versionButton.focus(); });
versionPage.addEventListener('click', event => { if(event.target === versionPage) { versionPage.hidden = true; versionButton.focus(); } });
document.addEventListener('keydown', event => { if(event.key !== 'Escape') return; if(!bioPage.hidden) { bioPage.hidden = true; bioButton.focus(); } else if(!versionPage.hidden) { versionPage.hidden = true; versionButton.focus(); } });

const gcsSteps = [
  { key: 'E', label: '睜眼反應', title: '觀察對方是否睜開眼睛。', instruction: '先觀察是否自然睜眼；若沒有，可用平常音量呼喚。無法判斷或有眼部因素時，請選擇「無法評估」。', choices: [[4, '自然睜開眼睛'], [3, '聽到呼喚後睜眼'], [2, '對壓力刺激有反應（限受過訓練者）'], [1, '沒有睜眼反應'], ['NT', '無法評估，例如眼部受傷或腫脹']] },
  { key: 'V', label: '言語反應', title: '觀察對方的說話內容。', instruction: '可詢問簡短問題，例如姓名或所在位置；依最符合的反應選擇。', choices: [[5, '說話有條理，能正確回答'], [4, '可說話，但內容混亂或答非所問'], [3, '只說出零星字詞'], [2, '只有呻吟或無法理解的聲音'], [1, '沒有言語反應'], ['NT', '無法評估，例如插管或口腔嚴重受傷']] },
  { key: 'M', label: '動作反應', title: '觀察對方最佳的動作反應。', instruction: '先請對方依指令做簡單動作，例如握手或抬手；左右兩側應以最佳反應記錄。', choices: [[6, '可依指令做出動作'], [5, '對壓力刺激可定位反應（限受過訓練者）'], [4, '對壓力刺激有正常屈曲反應（限受過訓練者）'], [3, '對壓力刺激有異常屈曲反應（限受過訓練者）'], [2, '對壓力刺激有伸展反應（限受過訓練者）'], [1, '沒有動作反應'], ['NT', '無法評估，例如嚴重肢體傷害']] }
];
let gcsCurrent = 0;
let gcsAnswers = [];
function renderGcsStep(){
  const step = gcsSteps[gcsCurrent];
  document.querySelector('#gcsStepLabel').textContent = `GCS 步驟 ${gcsCurrent + 1}／3`;
  document.querySelector('#gcsProgressText').textContent = `${step.key}｜${step.label}`;
  document.querySelector('#gcsProgressBar').style.width = `${((gcsCurrent + 1) / 3) * 100}%`;
  gcsCard.innerHTML = `<div class="step-illustration"><div class="gcs-key">${step.key}</div></div><div class="card-copy"><span class="step-pill">${step.key}｜${step.label}</span><h2>${step.title}</h2><p class="instruction">${step.instruction}</p><div class="gcs-intro"><span class="gcs-key">！</span><span><strong>安全提醒：</strong>若對方沒有正常反應、呼吸異常或狀況惡化，請立即撥打 119。</span></div><div class="gcs-choices">${step.choices.map(([score, text]) => `<button class="gcs-choice ${score === 'NT' ? 'nt' : ''}" type="button" data-score="${score}"><span class="gcs-score">${score}</span><span>${text}</span></button>`).join('')}</div></div>`;
  gcsCard.querySelectorAll('[data-score]').forEach(button => button.addEventListener('click', () => chooseGcs(button.dataset.score)));
}
function chooseGcs(score){
  gcsAnswers.push({ ...gcsSteps[gcsCurrent], score: score === 'NT' ? 'NT' : Number(score) });
  gcsCurrent += 1;
  if(gcsCurrent < gcsSteps.length) renderGcsStep(); else showGcsResult();
}
function showGcsResult(){
  gcsArea.hidden = true;
  gcsResult.hidden = false;
  const hasNt = gcsAnswers.some(answer => answer.score === 'NT');
  const total = hasNt ? null : gcsAnswers.reduce((sum, answer) => sum + answer.score, 0);
  const summary = gcsAnswers.map(answer => `${answer.key}${answer.score}`).join('　');
  const concerning = hasNt || total === null || total < 15;
  const now = new Intl.DateTimeFormat('zh-TW', { dateStyle: 'short', timeStyle: 'short' }).format(new Date());
  gcsResult.innerHTML = `<article class="result-card ${concerning ? '' : 'safe-result'}"><div class="result-icon">${concerning ? '！' : '✓'}</div><h2>${hasNt ? '評估紀錄已完成' : `GCS ${total} 分`}</h2><p>${hasNt ? '有項目無法評估，因此不計算總分。請將各分項紀錄提供給救護或醫護人員。' : '請以各分項反應與評估時間一併交接；總分僅供紀錄，不能取代專業判斷。'}</p><div class="gcs-summary-grid">${gcsAnswers.map(answer => `<div class="gcs-summary-item">${answer.key}${answer.score}<small>${answer.label}</small></div>`).join('')}</div>${concerning ? '<a class="call-button" href="tel:119">意識異常請撥打 <b>119</b></a>' : ''}<p class="gcs-time">評估時間：${now}</p><button class="primary-button" id="gcsRestart" type="button">重新評估</button></article>`;
  document.querySelector('#gcsRestart').addEventListener('click', startGcs);
  addPngButton(gcsResult.querySelector('.result-card'), 'GCS 昏迷指數結果', [
    ['評估時間', now],
    ...gcsAnswers.map(answer => [answer.label, `${answer.key}${answer.score}`]),
    ['總分', hasNt ? '有項目無法評估，不計算總分' : `${total} 分`],
    ['結果提醒', concerning ? '請立即尋求救護或醫療協助。' : '本結果僅供紀錄，不能取代專業判斷。']
  ], `GCS評估-${new Date().toISOString().slice(0, 16).replace('T', '-')}.png`);
  gcsResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function startGcs(){
  gcsCurrent = 0; gcsAnswers = []; homePage.hidden = true; vitalsArea.hidden = true; triageArea.hidden = true; checkArea.hidden = true; resultArea.hidden = true; gcsResult.hidden = true; gcsArea.hidden = false; restartButton.hidden = true; homeButton.hidden = false; renderGcsStep(); gcsArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
gcsStartButton.addEventListener('click', startGcs);

const temperatureReferences = {
  forehead: { name: '額溫', low: 35, high: 37, fever: 37.5 },
  ear: { name: '耳溫', low: 35.9, high: 37.6, fever: 37.6 },
  axillary: { name: '腋溫', low: 35, high: 37, fever: 37.5 },
  rectal: { name: '肛溫', low: 36.2, high: 37.9, fever: 38 }
};
function getAgeInMonths(value, unit){
  const age = Number(value);
  if(!Number.isFinite(age) || age < 0) return NaN;
  if(unit === 'days') return age / 30.4375;
  if(unit === 'months') return age;
  return age * 12;
}
function ageLabel(months){
  if(months < 28 / 30.4375) return '新生兒（未滿 28 天）';
  if(months < 12) return '嬰兒（未滿 1 歲）';
  if(months < 72) return '幼兒及學齡前兒童（1～未滿 6 歲）';
  if(months < 144) return '學齡期兒童（6～未滿 12 歲）';
  return '青少年及成人（12 歲以上）';
}
function ageSpecificReferences(months){
  const pulse = months < 3 ? [85, 205, '清醒心跳參考：85 至 205 次／分鐘']
    : months < 24 ? [100, 190, '清醒心跳參考：100 至 190 次／分鐘']
    : months < 120 ? [60, 140, '清醒心跳參考：60 至 140 次／分鐘']
    : [60, 100, '清醒心跳參考：60 至 100 次／分鐘'];
  let respiration;
  let bloodPressure;
  if(months < 1){ respiration = [30, 60]; bloodPressure = '收縮壓 78～86／舒張壓 42～54 mmHg'; }
  else if(months < 6){ respiration = [30, 50]; bloodPressure = '收縮壓 86～90／舒張壓 54～60 mmHg'; }
  else if(months < 12){ respiration = [24, 46]; bloodPressure = '收縮壓 90～96／舒張壓 60～65 mmHg'; }
  else if(months < 48){ respiration = [20, 30]; bloodPressure = '收縮壓 96～99／舒張壓約 65 mmHg'; }
  else if(months < 72){ respiration = [20, 25]; bloodPressure = '收縮壓 99～100／舒張壓 60～65 mmHg'; }
  else if(months < 144){ respiration = [16, 20]; bloodPressure = '收縮壓 100～115／舒張壓約 60 mmHg'; }
  else { respiration = [12, 20]; bloodPressure = '來源列示收縮壓 100～115／舒張壓約 60 mmHg；成人血壓另依國健署資料參考'; }
  return {
    pulse: { low: pulse[0], high: pulse[1], detail: pulse[2] },
    respiration: { low: respiration[0], high: respiration[1], detail: `呼吸參考：${respiration[0]} 至 ${respiration[1]} 次／分鐘` },
    bloodPressure
  };
}
function referenceStatus(value, low, high, highMessage, normalMessage){
  if(!Number.isFinite(value)) return '尚未輸入數值';
  if(value < low) return '低於資料參考範圍';
  if(value > high) return highMessage;
  return normalMessage;
}
function vitalCard(type, title, value, unit, status, detail){
  const display = Number.isFinite(value) || typeof value === 'string' ? `${value}<small>${unit}</small>` : '—';
  return `<article class="vital-card ${type}"><h4>${title}</h4><div class="vital-value">${display}</div><p>${status}<br />${detail}</p></article>`;
}
vitalsForm.addEventListener('submit', event => {
  event.preventDefault();
  const temperature = Number.parseFloat(document.querySelector('#temperature').value);
  const pulse = Number.parseFloat(document.querySelector('#pulse').value);
  const respiration = Number.parseFloat(document.querySelector('#respiration').value);
  const systolic = Number.parseFloat(document.querySelector('#systolic').value);
  const diastolic = Number.parseFloat(document.querySelector('#diastolic').value);
  const ageMonths = getAgeInMonths(document.querySelector('#ageValue').value, document.querySelector('#ageUnit').value);
  const ageDescription = ageLabel(ageMonths);
  const ageReferences = ageSpecificReferences(ageMonths);
  const note = document.querySelector('#vitalsNote').value.trim();
  const reference = temperatureReferences[document.querySelector('#temperatureSite').value];
  const temperatureStatus = referenceStatus(temperature, reference.low, reference.high, `高於 ${reference.name} 資料參考範圍`, '在資料參考範圍');
  const pulseStatus = referenceStatus(pulse, ageReferences.pulse.low, ageReferences.pulse.high, '高於所選年齡資料參考範圍', '在所選年齡資料參考範圍');
  const respirationStatus = referenceStatus(respiration, ageReferences.respiration.low, ageReferences.respiration.high, '高於所選年齡資料參考範圍', '在所選年齡資料參考範圍');
  const pressureStatus = Number.isFinite(systolic) && Number.isFinite(diastolic) ? '來源參考值僅供對照，請由醫療人員依年齡及臨床狀況判讀' : '尚未輸入完整血壓數值';
  const bpValue = Number.isFinite(systolic) && Number.isFinite(diastolic) ? `${systolic}／${diastolic}` : NaN;
  const now = new Intl.DateTimeFormat('zh-TW', { dateStyle: 'short', timeStyle: 'short' }).format(new Date());
  vitalsResults.hidden = false;
  vitalsResults.innerHTML = `<h3>您的生命徵象資料卡</h3><p class="vitals-disclaimer">年齡參考區間依本頁列示資料整理，兒科資料表修訂於 2013 年；僅供對照，清醒／睡眠、活動、發燒與臨床狀況都會影響數值。</p><div class="vital-cards">${vitalCard('vital-temp', '體溫', temperature, '°C', temperatureStatus, `${reference.name}參考：${reference.low} 至 ${reference.high} °C`)}${vitalCard('vital-pulse', '脈搏', pulse, '次／分鐘', pulseStatus, ageReferences.pulse.detail)}${vitalCard('vital-resp', '呼吸', respiration, '次／分鐘', respirationStatus, ageReferences.respiration.detail)}${vitalCard('vital-bp', '血壓', bpValue, 'mmHg', pressureStatus, ageReferences.bloodPressure) }</div><section class="vitals-summary"><h4>就醫溝通摘要</h4><p>年齡：${ageDescription}<br />量測時間：${now}<br />體溫：${Number.isFinite(temperature) ? `${temperature} °C（${reference.name}）` : '未輸入'}；脈搏：${Number.isFinite(pulse) ? `${pulse} 次／分鐘` : '未輸入'}；呼吸：${Number.isFinite(respiration) ? `${respiration} 次／分鐘` : '未輸入'}；血壓：${Number.isFinite(systolic) && Number.isFinite(diastolic) ? `${systolic}／${diastolic} mmHg` : '未輸入'}。${note ? `<br />症狀備註：${note.replace(/</g, '&lt;').replace(/>/g, '&gt;')}` : ''}</p><p class="vitals-time">這份資料用於協助說明，不取代醫療判斷。</p></section><section class="vitals-callout"><div class="emergency-icon">!</div><div><strong>出現危急症狀時，不要等待重測。</strong><p>若有無意識、呼吸困難、持續胸痛、大量出血或症狀突然惡化，請立即撥打 119。</p></div></section>`;
  addPngButton(vitalsResults, '生命徵象資料卡', [
    ['年齡', ageDescription],
    ['量測時間', now],
    ['體溫', Number.isFinite(temperature) ? `${temperature} °C（${reference.name}；參考 ${reference.low}～${reference.high} °C）` : '未輸入'],
    ['脈搏', Number.isFinite(pulse) ? `${pulse} 次／分鐘；${ageReferences.pulse.detail}` : '未輸入'],
    ['呼吸', Number.isFinite(respiration) ? `${respiration} 次／分鐘；${ageReferences.respiration.detail}` : '未輸入'],
    ['血壓', Number.isFinite(systolic) && Number.isFinite(diastolic) ? `${systolic}／${diastolic} mmHg；${ageReferences.bloodPressure}` : `未輸入完整數值；${ageReferences.bloodPressure}`],
    ['症狀備註', note || '無']
  ], `生命徵象-${new Date().toISOString().slice(0, 16).replace('T', '-')}.png`);
  vitalsResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
});
const ageValueInput = document.querySelector('#ageValue');
const ageUnitSelect = document.querySelector('#ageUnit');
const ageGroupPreview = document.querySelector('#ageGroupPreview');
function updateAgePreview(){
  ageValueInput.max = ageUnitSelect.value === 'days' ? '43800' : ageUnitSelect.value === 'months' ? '1440' : '120';
  const months = getAgeInMonths(ageValueInput.value, ageUnitSelect.value);
  ageGroupPreview.textContent = Number.isFinite(months) ? `資料卡年齡分類：${ageLabel(months)}` : '將依年齡顯示所屬年齡層。';
}
ageValueInput.addEventListener('input', updateAgePreview);
ageUnitSelect.addEventListener('change', updateAgePreview);
if('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js'));
