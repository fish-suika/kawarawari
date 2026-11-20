// ===== 描画（Canvas 2D。世界の座標は「遊ぶ場所の幅 = 100」。カメラで見せ場に合わせて引く）=====
const $ = id => document.getElementById(id);
const cv = $('cv'), cx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1;
let CAMV = viewFor(BASE_CAM, 390, 844);   // 今のカメラが見ている世界の範囲
let nowT = 0;
const IDLE = buildShow(0, CFG.seed);      // 連打の間の世界（壊れる前の姿）

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
}

// 配置は 30-show.js（GY・KX・TX…）
const TIER_COL = ['#ffffff', '#fff2a8', '#ffd84a', '#ffa63a', '#ff6a2a', '#ff3d4a', '#e63cc8', '#7a5cff'];

// ---- 演出の状態 ----
const V = { kick: 0, bounce: 0, pulse: 0, aura: 12, flash: 0, slam: 0 };
const sparks = [], rings = [];
const SPARK_MAX = 90;

function rr(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
function mix(c1, c2, k) {
  const p = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const a = p(c1), b = p(c2);
  return 'rgb(' + a.map((v, i) => Math.round(lerp(v, b[i], k))).join(',') + ')';
}

// 押した反応（見た目）
function onHit(e) {
  V.kick = Math.min(1.6, V.kick + 0.5);
  V.bounce = 1; V.pulse = 1;
  const n = e.tier >= 4 ? 3 : 2;
  for (let i = 0; i < n && sparks.length < SPARK_MAX; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.6, sp = 18 + Math.random() * 26 + e.tier * 3;
    sparks.push({ x: KX + 6 + (Math.random() - 0.5) * 6, y: 78 + Math.random() * 8, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: 0.35 + Math.random() * 0.3, col: TIER_COL[e.tier], r: 0.9 + Math.random() * 0.9 });
  }
  if (e.tierUp) {
    rings.push({ life: 0, max: 0.6, col: TIER_COL[e.tier] });
    V.flash = Math.min(0.5, 0.12 + e.tier * 0.04);
  }
}
function onSlam() { V.slam = 1; V.flash = 0.6; V.kick = 3; }
function resetVisual() { V.kick = 0; V.bounce = 0; V.pulse = 0; V.aura = 12; V.flash = 0; V.slam = 0; sparks.length = 0; rings.length = 0; }

function updateVisual(dt) {
  V.kick *= Math.exp(-dt * 7);
  V.bounce *= Math.exp(-dt * 12);
  V.pulse *= Math.exp(-dt * 8);
  V.flash *= Math.exp(-dt * 6);
  V.slam *= Math.exp(-dt * 4);
  const target = Game.mode === 'title' ? 12 : (Game.mode === 'show' || Game.mode === 'over') ? 0 : 14 + Game.count * 0.55;
  V.aura += (target - V.aura) * (1 - Math.exp(-dt * 10));
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i]; s.life += dt;
    if (s.life >= s.max) { sparks.splice(i, 1); continue; }
    s.vy += 60 * dt; s.x += s.vx * dt; s.y += s.vy * dt;
  }
  for (let i = rings.length - 1; i >= 0; i--) { rings[i].life += dt; if (rings[i].life >= rings[i].max) rings.splice(i, 1); }
}

function twoBone(sx, sy, tx, ty, l1, l2) {
  const dx = tx - sx, dy = ty - sy, d0 = Math.hypot(dx, dy) || 0.01;
  const d = clamp(d0, Math.abs(l1 - l2) + 0.1, l1 + l2 - 0.05);
  const ux = dx / d0, uy = dy / d0;
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  return { ex: sx + ux * a + uy * h, ey: sy + uy * a - ux * h, hx: sx + ux * d, hy: sy + uy * d };
}

// ---- 空・雲・裏山の芯・住人 ----
const CLOUDS = [[-200, -110, 1], [110, -95, 1.3], [300, -150, 0.9], [-60, -190, 1.1], [-330, -40, 1.2], [420, -60, 1]];
const RESIDENTS = [[-290, '#ff8a5c'], [-275, '#5c9cff'], [350, '#f2c94c'], [365, '#7bd389']];

function drawSky(v) {
  const c = cx;
  const g = c.createLinearGradient(0, v.y0, 0, GY);
  g.addColorStop(0, '#86cdf0'); g.addColorStop(1, '#eaf8ff');
  c.fillStyle = g; c.fillRect(v.x0 - 5, v.y0 - 5, v.x1 - v.x0 + 10, GY - v.y0 + 6);
  c.fillStyle = '#e6d3b2'; c.fillRect(v.x0 - 5, GY - 1, v.x1 - v.x0 + 10, v.y1 - GY + 6);   // 穴の向こう側（クレーターの奥の壁）
  c.fillStyle = '#ffffffcc';
  for (const [x, y, s] of CLOUDS) {
    c.beginPath();
    c.ellipse(x, y, 34 * s, 9 * s, 0, 0, 6.283); c.ellipse(x - 20 * s, y + 3 * s, 20 * s, 7 * s, 0, 0, 6.283); c.ellipse(x + 22 * s, y + 2 * s, 24 * s, 8 * s, 0, 0, 6.283);
    c.fill();
  }
  // 裏山の芯（山が割れた隙間から見える暗い部分）
  c.fillStyle = '#5f957f';
  c.beginPath(); c.moveTo(MT_L[0], MT_L[1]);
  for (let i = 2; i < MT_L.length - 2; i += 2) c.lineTo(MT_L[i], MT_L[i + 1]);
  for (let i = 2; i < MT_R.length - 2; i += 2) c.lineTo(MT_R[i], MT_R[i + 1]);
  c.closePath(); c.fill();
}

// 遠くから見ている住人（避難済み。けがはしない。万歳して小さく跳ねている）
function drawResidents(t) {
  const c = cx;
  c.lineCap = 'round';
  for (let i = 0; i < RESIDENTS.length; i++) {
    const x = RESIDENTS[i][0], hop = Math.abs(Math.sin(t * 6 + i * 1.7)) * 1.5;
    c.strokeStyle = RESIDENTS[i][1]; c.lineWidth = 3.2;
    c.beginPath(); c.moveTo(x, GY - 6 - hop); c.lineTo(x, GY - 14 - hop); c.stroke();
    c.lineWidth = 1.4; c.beginPath(); c.moveTo(x - 4, GY - 16 - hop); c.lineTo(x, GY - 12 - hop); c.lineTo(x + 4, GY - 16 - hop); c.stroke();
    c.beginPath(); c.moveTo(x - 1.5, GY - hop); c.lineTo(x, GY - 6 - hop); c.lineTo(x + 1.5, GY - hop); c.stroke();
    c.fillStyle = '#f6cfa6'; c.beginPath(); c.arc(x, GY - 17.5 - hop, 2.4, 0, 6.283); c.fill();
  }
}

// 地面の断面：地層の帯、道場の下の階、クレーター（足場の柱だけ残る）
function drawGround(v, cp) {
  const c = cx, xL = v.x0 - 30, xR = v.x1 + 30, yB = v.y1 + 40;
  const xs = [xL, xR];
  if (cp > 0) {
    for (let x = CR.x - CR.R - 6; x <= CR.x + CR.R + 6; x += 6) xs.push(x);
    for (const e of [PX - PW / 2, PX + PW / 2]) xs.push(e - 0.001, e + 0.001);
  }
  xs.sort((a, b) => a - b);
  c.save(); c.beginPath();
  let first = true;
  for (const x of xs) {
    if (x < xL || x > xR) continue;
    const y = craterTop(x, cp);
    if (first) { c.moveTo(x, y); first = false; } else c.lineTo(x, y);
  }
  c.lineTo(xR, yB); c.lineTo(xL, yB); c.closePath(); c.clip();
  for (let i = 0; i < STRATA.length; i++) {
    const y0 = STRATA[i][0], y1 = i + 1 < STRATA.length ? STRATA[i + 1][0] : yB;
    c.fillStyle = STRATA[i][1]; c.fillRect(xL, y0, xR - xL, Math.max(y1, y0 + 1) - y0 + 0.5);
  }
  // 下の階（道場の真下の部屋）
  c.fillStyle = '#a98d68'; c.fillRect(DL, GY, DR - DL, BY - GY);
  c.fillStyle = '#8f7452';
  for (let x = DL + 17; x < DR; x += 34) c.fillRect(x - 1, GY, 2, BY - GY);
  c.fillRect(DL, 176, DR - DL, 1.6);
  c.fillStyle = '#d3a35a'; c.fillRect(DL, BY, DR - DL, 9);
  c.fillStyle = '#8f6a30'; c.fillRect(DL, BY, DR - DL, 1.2);
  c.restore();
}

// 破片・建物・山など（lay：奥から手前）。時刻 tp の姿勢は 30-show.js の poseAt
const po = { x: 0, y: 0, a: 0, al: 1, s: 1 };
function drawPieces(sh, lay, tp, jit) {
  const c = cx, amp = 0.35 + Math.min(Game.count, 70) * 0.012;
  for (const p of sh.pieces) {
    if (p.lay !== lay) continue;
    if (p.hid && tp < p.tb) continue;
    poseAt(p, tp, po);
    if (po.al <= 0.01) continue;
    if (jit && p.g === 'tile') {   // 連打の間の瓦の震え
      const i = CFG.tiles - 1 - p.idx, j = Math.sin(nowT * 65 + i * 2.31), j2 = Math.sin(nowT * 83 + i * 1.7);
      po.x += j * amp * V.kick * (0.4 + i * 0.05) + j * V.slam * 1.2; po.y += j2 * amp * V.kick * 0.25;
    }
    c.save(); c.translate(po.x, po.y);
    if (po.al < 1) c.globalAlpha = po.al;
    if (p.kind === 'puff') {
      c.fillStyle = p.col; c.beginPath(); c.arc(0, 0, po.s, 0, 6.283); c.fill();
    } else {
      if (po.a) c.rotate(po.a);
      const q = p.poly;
      c.beginPath(); c.moveTo(q[0], q[1]);
      for (let i = 2; i < q.length; i += 2) c.lineTo(q[i], q[i + 1]);
      c.closePath(); c.fillStyle = p.col; c.fill();
      if (p.edge) { c.strokeStyle = p.edge; c.lineWidth = 0.35; c.stroke(); }
      if (p.dec) for (const d of p.dec) { c.fillStyle = d[4]; c.fillRect(d[0], d[1], d[2], d[3]); }
      if (p.ck && tp >= p.ckT && tp < p.tb) {   // ひび
        c.strokeStyle = '#141a22'; c.lineWidth = 0.4; c.beginPath(); c.moveTo(p.ck[0], p.ck[1]);
        for (let i = 2; i < p.ck.length; i += 2) c.lineTo(p.ck[i], p.ck[i + 1]);
        c.stroke();
      }
    }
    c.restore();
  }
}

function drawAura() {
  const c = cx, t = Game.tier(), col = TIER_COL[t];
  if (Game.mode === 'title' || Game.mode === 'ready' || V.aura < 1.5) return;
  const ax = KX + 2, ay = 108, R = V.aura * (1 + V.pulse * 0.12);
  c.save(); c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(ax, ay, 0, ax, ay, R);
  g.addColorStop(0, col + 'cc'); g.addColorStop(0.5, col + '55'); g.addColorStop(1, col + '00');
  c.fillStyle = g; c.beginPath(); c.arc(ax, ay, R, 0, 6.283); c.fill();
  if (t >= 1) {   // 10 回ごとに一段派手に：光の筋
    const n = 6 + t * 2, rot = nowT * (0.6 + t * 0.25);
    c.fillStyle = col + '40';
    for (let i = 0; i < n; i++) {
      const a = rot + i * 6.283 / n, w = 0.11, rl = R * (1.15 + 0.1 * Math.sin(nowT * 9 + i));
      c.beginPath(); c.moveTo(ax + Math.cos(a - w) * R * 0.55, ay + Math.sin(a - w) * R * 0.55);
      c.lineTo(ax + Math.cos(a) * rl, ay + Math.sin(a) * rl);
      c.lineTo(ax + Math.cos(a + w) * R * 0.55, ay + Math.sin(a + w) * R * 0.55); c.fill();
    }
  }
  for (const r of rings) {
    const p = r.life / r.max;
    c.strokeStyle = r.col; c.globalAlpha = 1 - p; c.lineWidth = 1.6 * (1 - p) + 0.3;
    c.beginPath(); c.arc(ax, ay, R * (0.7 + p * 1.1), 0, 6.283); c.stroke();
  }
  c.restore();
}

// 空手家の今の姿勢（腕の目標と顔）。連打〜せいっは Phase 1 のまま、見せ場は 30-show.js の karaAt
function karaView() {
  const m = Game.mode, sh = Game.show;
  if ((m === 'show' || m === 'over') && sh) {
    const t = m === 'show' ? Game.showT : sh.dur, k = karaAt(sh, t);
    return { dx: k.dx, dy: k.dy, tx: k.tx, ty: k.ty, face: k.face, t, by: 0, pain: sh.stage === 0 };
  }
  let tx = KX + 11, ty = 76 + (m === 'play' ? -V.bounce * 1.5 : 0);
  if (m === 'title') { tx = KX + 11; ty = 98; }
  if (m === 'ready') { tx = KX + 12; ty = 84; }
  if (m === 'finish') {
    const e = Math.pow(clamp(Game.finT / 0.12, 0, 1), 2);
    tx = lerp(KX + 11, 61, e); ty = lerp(76, TB - CFG.tiles * TP - 3, e);
  }
  const by = V.bounce * 1.2 + (m === 'play' ? Math.sin(nowT * 30) * 0.15 * Math.min(1, Game.count / 20) : 0);
  return { dx: 0, dy: 0, tx, ty, face: m === 'play' || m === 'finish' ? 'shout' : 'calm', t: nowT, by, pain: false };
}

function drawKarateka() {
  const c = cx, K = karaView();
  const skin = mix('#f6cfa6', '#ff7a5a', clamp(Game.count / 70, 0, 1));
  c.save(); c.translate(K.dx, K.dy + K.by);
  // 影
  c.save(); c.translate(0, -K.by); c.fillStyle = '#0003'; c.beginPath(); c.ellipse(KX + 1, GY + 1.5, 15, 2.6, 0, 0, 6.283); c.fill(); c.restore();
  c.lineCap = 'round'; c.lineJoin = 'round';
  const white = '#fbfbf6', edge = '#a9a392';
  // 脚（馬立ち）
  c.strokeStyle = edge; c.lineWidth = 8.4; c.beginPath(); c.moveTo(KX - 3, 122); c.lineTo(KX - 10, GY - 1); c.moveTo(KX + 5, 122); c.lineTo(KX + 12, GY - 1); c.stroke();
  c.strokeStyle = white; c.lineWidth = 7; c.beginPath(); c.moveTo(KX - 3, 122); c.lineTo(KX - 10, GY - 1); c.moveTo(KX + 5, 122); c.lineTo(KX + 12, GY - 1); c.stroke();
  c.fillStyle = skin; c.beginPath(); c.ellipse(KX - 11, GY - 0.3, 4, 1.6, 0, 0, 6.283); c.ellipse(KX + 13, GY - 0.3, 4, 1.6, 0, 0, 6.283); c.fill();
  // 後ろの腕（ふだんは腰に。痛いときは手首を押さえる）
  if (K.pain) {
    const bk = twoBone(KX - 5, 105, K.tx - 1, K.ty + 2, 20, 20);
    c.strokeStyle = edge; c.lineWidth = 6.6; c.beginPath(); c.moveTo(KX - 5, 105); c.lineTo(bk.ex, bk.ey); c.lineTo(bk.hx, bk.hy); c.stroke();
    c.strokeStyle = white; c.lineWidth = 5.4; c.beginPath(); c.moveTo(KX - 5, 105); c.lineTo(bk.ex, bk.ey); c.lineTo(bk.hx, bk.hy); c.stroke();
  } else {
    c.strokeStyle = edge; c.lineWidth = 6.6; c.beginPath(); c.moveTo(KX - 5, 105); c.lineTo(KX - 11, 114); c.lineTo(KX - 5, 118); c.stroke();
    c.strokeStyle = white; c.lineWidth = 5.4; c.beginPath(); c.moveTo(KX - 5, 105); c.lineTo(KX - 11, 114); c.lineTo(KX - 5, 118); c.stroke();
  }
  // 胴
  c.fillStyle = white; c.strokeStyle = edge; c.lineWidth = 0.7;
  rr(c, KX - 8, 99, 17, 25, 4.5); c.fill(); c.stroke();
  c.strokeStyle = edge; c.lineWidth = 0.6; c.beginPath(); c.moveTo(KX - 1, 99); c.lineTo(KX + 4, 110); c.lineTo(KX + 7, 99); c.stroke();   // 襟
  c.fillStyle = '#26262e'; c.fillRect(KX - 8.3, 118.5, 17.6, 3.2);   // 黒帯
  // 頭
  const hx = KX + 1.5, hy = 91;
  c.fillStyle = skin; c.strokeStyle = '#b98a62'; c.lineWidth = 0.6;
  c.beginPath(); c.arc(hx, hy, 7, 0, 6.283); c.fill(); c.stroke();
  c.fillStyle = '#26262e'; c.beginPath(); c.arc(hx - 0.6, hy - 1.2, 7.3, Math.PI * 1.02, Math.PI * 2.0); c.fill();
  c.fillStyle = '#fff'; c.fillRect(hx - 7.2, hy - 2.6, 14.4, 2.2);   // はちまき
  c.fillStyle = '#d2382f'; c.beginPath(); c.arc(hx, hy - 1.5, 1.1, 0, 6.283); c.fill();
  c.fillStyle = '#26262e'; c.strokeStyle = '#26262e';
  if (K.face === 'pain') {            // >_< と汗
    c.lineWidth = 0.8; c.beginPath(); c.moveTo(hx + 2, hy - 0.5); c.lineTo(hx + 4, hy + 1); c.lineTo(hx + 2, hy + 2.4); c.stroke();
    c.beginPath(); c.moveTo(hx + 1.6, hy - 1.6); c.lineTo(hx + 5, hy - 0.6); c.stroke();
    c.strokeStyle = '#7a1f1a'; c.beginPath(); c.moveTo(hx + 1.6, hy + 4.6); c.lineTo(hx + 2.6, hy + 3.8); c.lineTo(hx + 3.6, hy + 4.6); c.lineTo(hx + 4.6, hy + 3.8); c.stroke();
    c.fillStyle = '#7ec8ff';
    for (let i = 0; i < 3; i++) { const u = (K.t * 2.2 + i / 3) % 1; c.globalAlpha = 1 - u; c.beginPath(); c.ellipse(hx + 8 + i * 2 + u * 5, hy - 6 - u * 7, 0.9, 1.4, 0, 0, 6.283); c.fill(); }
    c.globalAlpha = 1;
  } else if (K.face === 'serious') {  // 真顔：まっすぐな眉、点の目、一文字の口
    c.beginPath(); c.ellipse(hx + 3.2, hy + 1.2, 0.8, 0.8, 0, 0, 6.283); c.fill();
    c.lineWidth = 0.8; c.beginPath(); c.moveTo(hx + 1.8, hy - 0.5); c.lineTo(hx + 5, hy - 0.5); c.stroke();
    c.strokeStyle = '#7a1f1a'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(hx + 1.8, hy + 4.3); c.lineTo(hx + 4.6, hy + 4.3); c.stroke();
  } else {
    const shout = K.face === 'shout';
    c.beginPath(); c.ellipse(hx + 3.2, hy + 1.2, 0.9, shout ? 0.6 : 1, 0, 0, 6.283); c.fill();   // 目
    c.lineWidth = 0.8; c.beginPath(); c.moveTo(hx + 1.8, hy - 0.6); c.lineTo(hx + 5, hy + 0.2); c.stroke();   // まゆ
    if (shout) { c.fillStyle = '#7a1f1a'; c.beginPath(); c.ellipse(hx + 3.2, hy + 4.4, 1.7, 1.2 + Math.min(1, V.pulse) * 0.9, 0, 0, 6.283); c.fill(); }
    else { c.strokeStyle = '#7a1f1a'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(hx + 1.8, hy + 4.3); c.lineTo(hx + 4.6, hy + 4.3); c.stroke(); }
  }
  // 前の腕（二関節）
  const sx = KX + 3, sy = 104;
  const arm = twoBone(sx, sy, K.tx, K.ty, 22, 22);
  c.strokeStyle = edge; c.lineWidth = 6.6; c.beginPath(); c.moveTo(sx, sy); c.lineTo(arm.ex, arm.ey); c.lineTo(arm.hx, arm.hy); c.stroke();
  c.strokeStyle = white; c.lineWidth = 5.4; c.beginPath(); c.moveTo(sx, sy); c.lineTo(arm.ex, arm.ey); c.lineTo(arm.hx, arm.hy); c.stroke();
  c.fillStyle = skin; c.strokeStyle = '#b98a62'; c.lineWidth = 0.5;
  c.beginPath(); c.arc(arm.hx, arm.hy, 3.4, 0, 6.283); c.fill(); c.stroke();
  c.restore();
}

function drawSparks() {
  const c = cx;
  for (const s of sparks) {
    const p = s.life / s.max;
    c.globalAlpha = 1 - p; c.fillStyle = s.col;
    c.beginPath(); c.arc(s.x, s.y, s.r * (1 - p * 0.5), 0, 6.283); c.fill();
  }
  c.globalAlpha = 1;
}

function render() {
  const c = cx, m = Game.mode, sh = Game.show || IDLE;
  const inShow = !!Game.show && (m === 'show' || m === 'over');
  const ts = inShow ? (m === 'show' ? Game.showT : sh.dur) : 0;                                   // カメラ・演出の時刻
  const tp = inShow ? (m === 'show' ? Game.showT : sh.dur + Math.min(Game.overT, 3)) : 0;          // 破片の時刻（結果のあとも着地まで進む）
  const cam = inShow ? camAt(sh.stage, ts) : BASE_CAM, shk = inShow ? shakeAt(sh, ts, { x: 0, y: 0 }) : { x: 0, y: 0 };
  const v = CAMV = viewFor(cam, W, H);
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, cv.width, cv.height);
  c.setTransform(DPR * v.k, 0, 0, DPR * v.k, DPR * (W / 2 - cam.cx * v.k + shk.x), DPR * (H / 2 - cam.cy * v.k + shk.y));
  const jit = !inShow;
  drawSky(v);
  drawPieces(sh, 0, tp, jit);       // 裏山
  drawResidents(nowT);
  drawPieces(sh, 1, tp, jit);       // 家・電柱
  drawPieces(sh, 2, tp, jit);       // 道場の奥の壁・柱
  drawGround(v, craterAt(sh.stage, ts));
  drawAura();
  drawKarateka();
  drawPieces(sh, 3, tp, jit);       // 瓦・台・床
  drawPieces(sh, 4, tp, jit);       // 屋根・外の壁
  drawPieces(sh, 5, tp, jit);       // 砂ぼこり・土
  drawSparks();
  const f = Math.min(0.85, V.flash + (inShow ? flashAt(sh, ts) : 0));
  if (f > 0.01) { c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = 'rgba(255,255,255,' + f + ')'; c.fillRect(0, 0, cv.width, cv.height); }
}
