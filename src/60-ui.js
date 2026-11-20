// ===== 操作・ループ・結果 =====
let shownResult = false, last = 0, cueI = 0, capKey = '';

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
  if (Game.mode === 'show') { Game.skip(); return; }   // 見せ場はタップで早送り
  if (Game.mode === 'over') { if (Game.canRetry()) retry(); return; }
  Game.tap();
}

// 段階ごとの大きな文字（言葉の途中では改行しない：「、」の後ろで区切る）
function setCap(text) {
  const el = $('cap'), parts = text.split(/(?<=、)/);
  el.innerHTML = parts.map(p => '<span class="nb">' + p + '</span>').join('');
  el.style.fontSize = Math.min(17, 86 / text.length) + 'cqw';
  el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
}
function hideCap() { $('cap').classList.remove('on'); }

function bindUI() {
  cv.addEventListener('pointerdown', e => { e.preventDefault(); press(); });   // マルチタッチは指ごとに 1 回
  cv.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('keydown', e => {
    if (!acceptKey(e)) { if (e.key === ' ' || e.key === 'Enter') e.preventDefault(); return; }
    e.preventDefault();
    press();
  });
  $('again').addEventListener('click', () => { if (Game.canRetry()) retry(); $('again').blur(); });
  $('share').addEventListener('click', () => { share(); $('share').blur(); });
  // ダブルタップ拡大・ピンチを止める（iOS）。認定証の中のボタンは普通に押せるように
  for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, e => e.preventDefault());
  const inCert = e => !!(e.target && e.target.closest && e.target.closest('#cert'));
  let lastTouchEnd = 0;
  document.addEventListener('touchend', e => { const n = Date.now(); if (!inCert(e) && n - lastTouchEnd < 350) e.preventDefault(); lastTouchEnd = n; }, { passive: false });
  document.addEventListener('touchmove', e => { if (!inCert(e)) e.preventDefault(); }, { passive: false });
  window.addEventListener('resize', () => { resize(); if (shownResult) layoutCert(); });
}

function retry() {
  Game.reset();
  shownResult = false;
  resetVisual();
  $('cert').classList.remove('show', 'ready'); RESL.on = false;
  $('call').classList.remove('on'); hideCap(); capKey = '';
  Game.begin();   // 再挑戦はそのまま「はじめ」から
}

// ---- 結果：段位認定証（最高段階は破門状）----
let REC = loadRec();   // 自己ベストと見た段階（保存できないときはこの中だけで動く）
const nbs = parts => parts.map(p => '<span class="nb">' + p + '</span>').join('');

function fillCert(S, n, r) {
  const el = $('cert'), ban = S >= 7, rank = rankFor(S);
  el.classList.toggle('ban', ban);
  $('cTitle').textContent = certTitle(S);
  $('cRank').textContent = rank; $('cRank').style.fontSize = (rank.length >= 4 ? 11.5 : 14) + 'cqw';
  $('cSeal').textContent = ban ? '破門' : S === 0 ? '再審' : '師範';
  $('cStage').innerHTML = nbs(CFG.stageNames[S].split(' '));
  $('cVerdict').innerHTML = nbs(VERDICTS[S]);
  $('cTiles').textContent = tileText(S);
  $('cCount').textContent = n;
  $('cNewC').style.display = r.newCount ? '' : 'none';
  $('cBest').innerHTML = nbs(['自己ベスト', stageLabel(REC.bestStage) + '・' + REC.bestCount + ' 回' + (r.newStage || r.newCount ? '（更新！）' : '')]).replace('</span><span', '</span>　<span');
  $('cSeenH').textContent = '見た段階　' + seenCount(REC) + ' / 8';
  let h = '';
  for (let i = 0; i < 8; i++) {
    const seen = REC.seen[i], cls = 'chip' + (seen ? ' on' : '') + (i === S ? ' cur' : '') + (r.newSeen.indexOf(i) >= 0 ? ' nw' : '');
    h += '<span class="' + cls + '">' + (seen ? stageLabel(i) : '？？？') + '</span>';
  }
  $('cSeen').innerHTML = h;
}
// 認定証の幅・位置を決める（縦は下に、横は右に）。高さは中身で決まるので測ってから
function layoutCert() {
  const el = $('cert');
  el.style.width = '400px'; el.style.left = '0px'; el.style.top = '0px';
  const ratio = Math.max(0.6, el.offsetHeight / 400);
  const box = certBox(W, H, ratio);
  el.style.width = box.w + 'px';
  let h = el.offsetHeight;
  if (h > H - 24) {   // 文の折り返しで予想より高くなったら、画面に収まるよう幅を縮める
    const w = box.w * (H - 24) / h;
    el.style.width = w + 'px'; box.w = w; box.x = box.portrait ? (W - w) / 2 : W - w - 14; h = el.offsetHeight;
  }
  const y = box.portrait ? H - h - 14 : (H - h) / 2;
  el.style.left = box.x + 'px'; el.style.top = y + 'px';
  Object.assign(RESL, { on: true, portrait: box.portrait, x: box.x, y, w: box.w, h });
}
function showResult() {
  shownResult = true;
  $('call').classList.remove('on');
  const S = Game.stage(), n = Game.count;
  const r = applyResult(REC, S, n); REC = r.rec; saveRec(REC);
  fillCert(S, n, r);
  layoutCert();
  $('cert').classList.add('show');
  Snd.cert(S);
}

// ---- 共有（認定証のカード画像）----
function fitText(c, text, x, y, maxW, size, weight, color, align) {
  let sz = size;
  c.font = weight + ' ' + sz + 'px ' + FONT;
  while (c.measureText(text).width > maxW && sz > 18) { sz -= 2; c.font = weight + ' ' + sz + 'px ' + FONT; }
  c.fillStyle = color; c.textAlign = align || 'center'; c.textBaseline = 'alphabetic';
  c.fillText(text, x, y);
}
function makeShareImage() {
  return new Promise(resolve => {
    try {
      const Wd = 1080, Ht = 1350, S = Game.stage(), n = Game.count, ban = S >= 7;
      const cc = document.createElement('canvas');
      cc.width = Wd; cc.height = Ht;
      const c = cc.getContext('2d');
      c.fillStyle = ban ? '#2c2832' : '#e8d6a8'; c.fillRect(0, 0, Wd, Ht);
      // 今の画面の絵（本人のまわり）
      const px = 60, py = 60, pw = Wd - 120, ph = 580;
      c.save(); rr(c, px, py, pw, ph, 28); c.clip();
      c.fillStyle = '#bfe6ff'; c.fillRect(px, py, pw, ph);
      try {
        const free = RESL.on ? (RESL.portrait ? { w: W, h: RESL.y } : { w: RESL.x, h: H }) : { w: W, h: H };
        const v = CAMV, sy0 = S >= 3 ? BY : GY, a = pw / ph;
        const sx = (KX + 1 - v.x0) * v.k, sy = (sy0 - 28 - v.y0) * v.k;
        const cw = Math.min(free.w, free.h * a), ch = cw / a;
        const x0 = clamp(sx - cw / 2, 0, Math.max(0, free.w - cw)), y0 = clamp(sy - ch / 2, 0, Math.max(0, free.h - ch));
        const k = cv.width / W;
        c.drawImage(cv, x0 * k, y0 * k, cw * k, ch * k, px, py, pw, ph);
      } catch (_) { /* 絵が取れなくても文字のカードは作る */ }
      c.restore();
      c.strokeStyle = ban ? '#8a8070' : '#7a4a22'; c.lineWidth = 10; rr(c, px, py, pw, ph, 28); c.stroke();
      // 認定証
      const ty = 670, th = Ht - ty - 60;
      c.fillStyle = ban ? '#f3eee2' : '#fffaf0'; c.strokeStyle = ban ? '#26222a' : '#7a4a22'; c.lineWidth = 12;
      rr(c, 60, ty, Wd - 120, th, 26); c.fill(); c.stroke();
      const ink = ban ? '#26222a' : '#7a1f1a';
      fitText(c, certTitle(S), Wd / 2, ty + 92, 700, 66, '900', ink);
      c.fillStyle = ban ? '#26222a' : '#c9a15a'; c.fillRect(140, ty + 116, Wd - 280, 5);
      c.textAlign = 'left'; c.font = 'bold 36px ' + FONT; c.fillStyle = '#7a6a58'; c.fillText('挑戦者 殿', 140, ty + 176);
      fitText(c, rankFor(S), 140, ty + 316, 560, 150, '900', ban ? '#26222a' : '#c8321f', 'left');
      c.save(); c.translate(Wd - 220, ty + 250); c.rotate(-0.24);
      c.strokeStyle = ban ? '#26222a' : '#c8321f'; c.lineWidth = 10; c.beginPath(); c.arc(0, 0, 88, 0, 6.283); c.stroke();
      fitText(c, ban ? '破門' : S === 0 ? '再審' : '師範', 0, 22, 120, 62, '900', ban ? '#26222a' : '#c8321f');
      c.restore();
      fitText(c, '「' + stageLabel(S) + '」', Wd / 2, ty + 430, 800, 88, '900', '#2b2b3a');
      fitText(c, '割った瓦 ' + tileText(S), Wd / 2, ty + 510, 800, 48, 'bold', '#3a2a1c');
      fitText(c, '連打 ' + n + ' 回', Wd / 2, ty + 570, 800, 54, 'bold', '#c8321f');
      fitText(c, '自己ベスト ' + stageLabel(REC.bestStage) + '・' + REC.bestCount + ' 回　見た段階 ' + seenCount(REC) + '/8', Wd / 2, ty + 625, 840, 36, 'bold', '#7a6a58');
      fitText(c, CFG.shareUrl, Wd / 2, Ht - 80, 860, 34, 'normal', ban ? '#d8d0c0' : '#5a3d1e');
      cc.toBlob(b => resolve(b), 'image/png');
    } catch (_) { resolve(null); }
  });
}
async function share() {
  const S = Game.stage(), text = shareText(S, Game.count), url = CFG.shareUrl;
  if (useWebShare(navigator.userAgent, navigator.maxTouchPoints) && navigator.share) {
    try {
      const blob = await makeShareImage();
      const file = blob ? new File([blob], 'kawarawari.png', { type: 'image/png' }) : null;
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ text, url, files: [file] });
      else await navigator.share({ text, url });
      return;
    } catch (err) {
      if (err && err.name === 'AbortError') return;
    }
  }
  window.open(tweetUrl(text, url), '_blank', 'noopener');
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
      setCall('せいっ'); Snd.sei();
    } else if (e.type === 'show') {      // 瓦に届いた：見せ場の始まり
      $('call').classList.remove('on'); cueI = 0; capKey = '';
      Snd.showBegin(); onSlam();
    } else if (e.type === 'over') {
      Snd.showEnd(!!e.skipped); hideCap();
    }
  }
  Game.events.length = 0;
}

// 見せ場の音の合図と大きな文字
function playShow() {
  const sh = Game.show;
  if (Game.mode !== 'show' || !sh) return;
  while (cueI < sh.cues.length && sh.cues[cueI].t <= Game.showT) Snd.cue(sh.cues[cueI++].s);
  const i = captionAt(sh, Game.showT), key = i < 0 ? '' : sh.caps[i].text;
  if (key !== capKey) { capKey = key; if (key) setCap(key); }
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
  playShow();
  if (Game.mode === 'over' && !shownResult && Game.overT >= CFG.certDelay) showResult();
  if (shownResult && Game.canRetry()) $('cert').classList.add('ready');
  updateHud();
  updateVisual(dt);
  render();
  requestAnimationFrame(frame);
}
