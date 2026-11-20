// ===== 描画（Canvas 2D。単位は「遊ぶ場所の幅 = 100」）=====
const $ = id => document.getElementById(id);
const cv = $('cv'), cx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1, U = 1, OX = 0, OY = 0;
let EX0 = 0, EX1 = 100, EY0 = 0, EY1 = 177.78;   // 画面いっぱいの範囲（遊ぶ場所の単位で）
let nowT = 0;

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  const sw = Math.min(W, H * 9 / 16);
  U = sw / 100; OX = (W - sw) / 2; OY = (H - sw * 16 / 9) / 2;
  EX0 = -OX / U; EX1 = 100 + OX / U; EY0 = -OY / U; EY1 = 177.78 + OY / U;
}

// 配置（仮の背景）
const GY = 140;                 // 床の高さ
const KX = 38;                  // 空手家の位置
const TX = 74, TW = 30, TP = 3, TH = 2.7, TB = 128;   // 瓦の中心x・幅・ピッチ・厚み・いちばん下の y
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
const lerp = (a, b, k) => a + (b - a) * k;
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
  const target = Game.mode === 'title' ? 12 : 14 + Game.count * 0.55;
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

function drawBackground() {
  const c = cx;
  let g = c.createLinearGradient(0, EY0, 0, GY);
  g.addColorStop(0, '#f6ecd2'); g.addColorStop(1, '#e6d2a4');
  c.fillStyle = g; c.fillRect(EX0, EY0, EX1 - EX0, GY - EY0 + 0.5);
  // 柱
  c.fillStyle = '#8a5a2e';
  for (let x = -Math.ceil(-EX0 / 34) * 34 + 8; x < EX1; x += 34) c.fillRect(x, EY0, 3.2, GY - EY0);
  c.fillStyle = '#6e4521'; c.fillRect(EX0, 44, EX1 - EX0, 2.4);   // 長押
  // 床
  g = c.createLinearGradient(0, GY, 0, EY1);
  g.addColorStop(0, '#c99a52'); g.addColorStop(1, '#a87a38');
  c.fillStyle = g; c.fillRect(EX0, GY, EX1 - EX0, EY1 - GY + 0.5);
  c.strokeStyle = '#8f6a30'; c.lineWidth = 0.35;
  c.beginPath();
  for (let y = GY + 7; y < EY1; y += 9 + (y - GY) * 0.12) { c.moveTo(EX0, y); c.lineTo(EX1, y); }
  c.stroke();
  c.fillStyle = '#6e4521'; c.fillRect(EX0, GY - 1.2, EX1 - EX0, 1.4);
}

function drawAura() {
  const c = cx, t = Game.tier(), col = TIER_COL[t];
  if (Game.mode === 'title' || Game.mode === 'ready') return;
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

function drawKarateka() {
  const c = cx, m = Game.mode;
  const by = V.bounce * 1.2 + (m === 'play' ? Math.sin(nowT * 30) * 0.15 * Math.min(1, Game.count / 20) : 0);   // 押すたびの沈み
  const skin = mix('#f6cfa6', '#ff7a5a', clamp(Game.count / 70, 0, 1));
  c.save(); c.translate(0, by);
  // 影
  c.save(); c.translate(0, -by); c.fillStyle = '#0003'; c.beginPath(); c.ellipse(KX + 1, GY + 1.5, 15, 2.6, 0, 0, 6.283); c.fill(); c.restore();
  c.lineCap = 'round'; c.lineJoin = 'round';
  const white = '#fbfbf6', edge = '#a9a392';
  // 脚（馬立ち）
  c.strokeStyle = edge; c.lineWidth = 8.4; c.beginPath(); c.moveTo(KX - 3, 122); c.lineTo(KX - 10, GY - 1); c.moveTo(KX + 5, 122); c.lineTo(KX + 12, GY - 1); c.stroke();
  c.strokeStyle = white; c.lineWidth = 7; c.beginPath(); c.moveTo(KX - 3, 122); c.lineTo(KX - 10, GY - 1); c.moveTo(KX + 5, 122); c.lineTo(KX + 12, GY - 1); c.stroke();
  c.fillStyle = skin; c.beginPath(); c.ellipse(KX - 11, GY - 0.3, 4, 1.6, 0, 0, 6.283); c.ellipse(KX + 13, GY - 0.3, 4, 1.6, 0, 0, 6.283); c.fill();
  // 後ろの腕（腰に）
  c.strokeStyle = edge; c.lineWidth = 6.6; c.beginPath(); c.moveTo(KX - 5, 105); c.lineTo(KX - 11, 114); c.lineTo(KX - 5, 118); c.stroke();
  c.strokeStyle = white; c.lineWidth = 5.4; c.beginPath(); c.moveTo(KX - 5, 105); c.lineTo(KX - 11, 114); c.lineTo(KX - 5, 118); c.stroke();
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
  c.fillStyle = '#26262e';
  const shout = m === 'play' || m === 'finish';
  c.beginPath(); c.ellipse(hx + 3.2, hy + 1.2, 0.9, shout ? 0.6 : 1, 0, 0, 6.283); c.fill();   // 目
  c.strokeStyle = '#26262e'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(hx + 1.8, hy - 0.6); c.lineTo(hx + 5, hy + 0.2); c.stroke();   // まゆ
  if (shout) { c.fillStyle = '#7a1f1a'; c.beginPath(); c.ellipse(hx + 3.2, hy + 4.4, 1.7, 1.2 + Math.min(1, V.pulse) * 0.9, 0, 0, 6.283); c.fill(); }
  else { c.strokeStyle = '#7a1f1a'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(hx + 1.8, hy + 4.3); c.lineTo(hx + 4.6, hy + 4.3); c.stroke(); }
  // 前の腕（二関節）。構え→振り下ろし
  const sx = KX + 3, sy = 104;
  let tx = KX + 11, ty = 76 + (m === 'play' ? -V.bounce * 1.5 : 0);
  if (m === 'title') { tx = KX + 11; ty = 98; }
  if (m === 'ready') { tx = KX + 12; ty = 84; }
  if (m === 'finish' || m === 'over') {
    const p = m === 'over' ? 1 : clamp(Game.finT / 0.12, 0, 1);
    const e = p * p;
    tx = lerp(KX + 11, TX - TW / 2 + 2, e); ty = lerp(76, TB - CFG.tiles * TP - 3, e);
  }
  const arm = twoBone(sx, sy, tx, ty, 22, 22);
  c.strokeStyle = edge; c.lineWidth = 6.6; c.beginPath(); c.moveTo(sx, sy); c.lineTo(arm.ex, arm.ey); c.lineTo(arm.hx, arm.hy); c.stroke();
  c.strokeStyle = white; c.lineWidth = 5.4; c.beginPath(); c.moveTo(sx, sy); c.lineTo(arm.ex, arm.ey); c.lineTo(arm.hx, arm.hy); c.stroke();
  c.fillStyle = skin; c.strokeStyle = '#b98a62'; c.lineWidth = 0.5;
  c.beginPath(); c.arc(arm.hx, arm.hy, 3.4, 0, 6.283); c.fill(); c.stroke();
  c.restore();
}

function drawTiles() {
  const c = cx, amp = 0.35 + Math.min(Game.count, 70) * 0.012;
  const kick = V.kick, slam = V.slam;
  // 台（レンガ2つ）
  c.fillStyle = '#948a7e'; c.strokeStyle = '#5e564c'; c.lineWidth = 0.5;
  for (const bx of [TX - TW / 2 - 0.5, TX + TW / 2 - 6.5]) { rr(c, bx, TB, 7, GY - TB, 1); c.fill(); c.stroke(); }
  for (let i = 0; i < CFG.tiles; i++) {
    const y = TB - (i + 1) * TP + (TP - TH);
    const j = Math.sin(nowT * 65 + i * 2.31), j2 = Math.sin(nowT * 83 + i * 1.7);
    const dx = j * amp * kick * (0.4 + i * 0.05) + j * slam * 1.2;
    const dy = j2 * amp * kick * 0.25;
    c.fillStyle = i % 2 ? '#667c92' : '#5b7188';
    c.strokeStyle = '#33414f'; c.lineWidth = 0.4;
    rr(c, TX - TW / 2 + dx, y + dy, TW, TH, 1); c.fill(); c.stroke();
    c.fillStyle = '#ffffff55'; c.fillRect(TX - TW / 2 + 1.5 + dx, y + 0.35 + dy, TW - 3, 0.45);
  }
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
  const c = cx;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, cv.width, cv.height);
  c.setTransform(DPR * U, 0, 0, DPR * U, DPR * OX, DPR * OY);
  drawBackground();
  drawAura();
  drawKarateka();
  drawTiles();
  drawSparks();
  if (V.flash > 0.01) { c.fillStyle = 'rgba(255,255,255,' + Math.min(0.8, V.flash) + ')'; c.fillRect(EX0, EY0, EX1 - EX0, EY1 - EY0); }
}
