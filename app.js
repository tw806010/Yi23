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
const startButton = document.querySelector('#startButton');
const cardStartButton = document.querySelector('#cardStartButton');
const restartButton = document.querySelector('#restartButton');
const homeButton = document.querySelector('#homeButton');
const homeBrand = document.querySelector('#homeBrand');
const bioButton = document.querySelector('#bioButton');
const bioPage = document.querySelector('#bioPage');
const bioCloseButton = document.querySelector('#bioCloseButton');
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
  if(isEmergency){
    resultArea.innerHTML = `<article class="result-card"><div class="result-icon">!</div><h2>疑似中風徵象</h2><p>您在「${abnormalities.join('、')}」發現異常。中風治療分秒必爭，請立即尋求緊急醫療協助。</p><a class="call-button" href="tel:119">立即撥打 <b>119</b></a><div class="summary"><h3>聯絡救護人員前，請準備：</h3><ul><li>患者何時最後看起來正常，或症狀何時開始。</li><li>已觀察到的異常狀況：${abnormalities.join('、')}。</li><li>請勿自行開車前往，也不要自行服藥。</li></ul></div></article>`;
  } else {
    resultArea.innerHTML = `<article class="result-card safe-result"><div class="result-icon">✓</div><h2>本次未發現明顯異常</h2><p>若症狀持續、反覆出現，或您仍覺得不對勁，請不要等待，立即撥打 119 或就近就醫。</p><button class="primary-button" id="resultRestart" type="button">重新檢查</button></article>`;
    document.querySelector('#resultRestart').addEventListener('click', reset);
  }
  resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function reset(){ current = 0; answers = []; resultArea.hidden = true; checkArea.hidden = false; restartButton.hidden = true; homeButton.hidden = false; renderStep(); checkArea.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
function startCheck(){ homePage.hidden = true; checkArea.hidden = false; restartButton.hidden = false; homeButton.hidden = false; renderStep(); checkArea.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
function returnHome(){ current = 0; answers = []; checkArea.hidden = true; resultArea.hidden = true; homePage.hidden = false; restartButton.hidden = true; homeButton.hidden = true; window.scrollTo({ top: 0, behavior: 'smooth' }); }
startButton.addEventListener('click', startCheck);
cardStartButton.addEventListener('click', startCheck);
restartButton.addEventListener('click', reset);
homeButton.addEventListener('click', returnHome);
homeBrand.addEventListener('click', event => { if(!homePage.hidden) return; event.preventDefault(); returnHome(); });
bioButton.addEventListener('click', () => { bioPage.hidden = false; bioCloseButton.focus(); });
bioCloseButton.addEventListener('click', () => { bioPage.hidden = true; bioButton.focus(); });
bioPage.addEventListener('click', event => { if(event.target === bioPage) { bioPage.hidden = true; bioButton.focus(); } });
document.addEventListener('keydown', event => { if(event.key === 'Escape' && !bioPage.hidden) { bioPage.hidden = true; bioButton.focus(); } });
if('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js'));
