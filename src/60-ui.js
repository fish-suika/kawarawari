// ===== 操作・ループ・結果 =====
let shownResult = false, last = 0;

function setCall(text) {
  const el = $('call');
  el.textContent = text;
  el.classList.remove('on');
  void el.offsetWidth;   // アニメーションを最初から
  el.classList.add('on');
 
}

// 画面どこでもタップ／スペース・Enter。タイトルで開始、結果で再挑戦、連打中は 1 回
function press() {
  Snd.init();
  if (Game.mode === 'title') { Game.begin(); return; }
  if (Game.mode === 'over') { if (Game.canRetry()) retry(); return; }
  Game.tap();
}

function bindUI() {
  cv.addEventListener('pointerdown', e => { e.preventDefault(); press(); });   // マルチタッチは指ごとに 1 回
  cv.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('keydown', e => {
    if (!acceptKey(e)) { if (e.key === ' ' || e.key === 'Enter') e.preventDefault(); return; }
    e.preventDefault();
    press();
  });
  // ダブルタップ拡大・ピンチを止める（iOS）
  for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, e => e.preventDefault());
  let lastTouchEnd = 0;
  document.addEventListener('touchend', e => { const n = Date.now(); if (n - lastTouchEnd < 350) e.preventDefault(); lastTouchEnd = n; }, { passive: false });
  document.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
  window.addEventListener('resize', resize);
}

function retry() {
  Game.reset();
  shownResult = false;
  resetVisual();
  $('result').classList.remove('show', 'ready');
  $('call').classList.remove('on');
  Game.begin();   // 再挑戦はそのまま「はじめ」から
}

// 結果（仮）。段階の名前と連打数
function showResult() {
  shownResult = true;
  $('call').classList.remove('on');
  const names = CFG.stageNames[Game.stage()].split(' ');
  $('rStage').innerHTML = names.map(n => '<span class="nb">' + n + '</span>').join(' ');
  $('rCnt').textContent = Game.count;
  $('result').classList.add('show');
  $('result').classList.remove('ready');
}

// ゲームの出来事を、見た目と音の反応にする
function reactToEvents() {
  for (const e of Game.events) {
    if (e.type === 'ready') {
      $('title').classList.add('hide');
      setCall('はじめ'); Snd.hajime();
    } else if (e.type === 'start') {
      $('call').classList.remove('on');
    } else if (e.type === 'hit') {
      Snd.taiko(e.count);
      if (e.tierUp) Snd.tier(e.tier);
      onHit(e);
    } else if (e.type === 'end') {
      setCall('せいっ'); Snd.sei(); onSlam();
    }
  }
  Game.events.length = 0;
}

function updateHud() {
  const m = Game.mode, playing = m === 'play', show = m === 'ready' || playing || m === 'finish';
  const rem = m === 'ready' ? CFG.duration : Game.remaining();
  $('tLeft').textContent = rem.toFixed(1);
  $('hudTop').classList.toggle('on', show);
  $('hudTop').classList.toggle('low', playing && rem <= 1.5);
  $('hudBot').classList.toggle('on', show);
  $('cNum').textContent = Game.count;
}

function frame(ts) {
  const dt = last ? Math.min((ts - last) / 1000, 0.1) : 0;
  last = ts; nowT += dt;
  Game.step(dt);
  reactToEvents();
  if (Game.mode === 'over' && !shownResult) showResult();
  if (shownResult && Game.canRetry()) $('result').classList.add('ready');
  updateHud();
  updateVisual(dt);
  render();
  requestAnimationFrame(frame);
}
