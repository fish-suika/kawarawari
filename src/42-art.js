// ===== 絵（Canvas）：道場の飾り・人・吹き出し・高台・光の輪・地層の模様 =====
// やわらかい線のイラスト風：明るい色の面に、あたたかい茶色の細い縁取り
const INK = '#6b4a3a';
const FONT = '"Hiragino Maru Gothic ProN","Yu Gothic UI","Meiryo",sans-serif';

// ---- 壁・床・瓦の飾り（物の中心が原点）----
const DECO = {
  planks(c, p) {                      // 下の壁：板張り
    const w = p.poly[2] - p.poly[0], h = p.poly[5] - p.poly[1], x0 = -w / 2;
    c.fillStyle = 'rgba(255,255,255,0.16)';
    for (let n = 0, x = x0; x < w / 2; n++, x += 6.4) if (n % 2) c.fillRect(x, -h / 2, Math.min(6.4, w / 2 - x), h);
    c.strokeStyle = '#c99a58'; c.lineWidth = 0.35; c.beginPath();
    for (let x = x0 + 6.4; x < w / 2 - 0.5; x += 6.4) { c.moveTo(x, -h / 2); c.lineTo(x, h / 2); }
    c.stroke();
    c.fillStyle = '#b9854a'; c.fillRect(x0, -h / 2, w, 2.2);
    c.fillStyle = '#d8b274'; c.fillRect(x0, -h / 2 + 2.2, w, 0.7);
    c.fillStyle = '#c9a060'; c.fillRect(x0, h / 2 - 3.4, w, 3.4);
  },
  window(c) {                         // 格子窓
    c.fillStyle = '#9a6a38'; c.fillRect(-10, -27, 20, 28);
    c.fillStyle = '#d6f1ff'; c.fillRect(-8.6, -25.6, 17.2, 25.2);
    c.fillStyle = 'rgba(255,255,255,0.7)';
    c.beginPath(); c.moveTo(-7.4, -24.6); c.lineTo(-1.4, -24.6); c.lineTo(-7.4, -14); c.closePath(); c.fill();
    c.fillStyle = '#9a6a38'; c.fillRect(-0.5, -25.6, 1, 25.2); c.fillRect(-8.6, -13.6, 17.2, 1);
    c.fillStyle = '#7a4f26'; c.fillRect(-11.5, 0.6, 23, 1.8);
  },
  plaque(c) {                         // 木の看板
    c.strokeStyle = '#8a6a4a'; c.lineWidth = 0.5; c.beginPath(); c.moveTo(-8, -20); c.lineTo(-8, -28); c.moveTo(8, -20); c.lineTo(8, -28); c.stroke();
    c.fillStyle = '#7a4a22'; c.fillRect(-12.5, -20.5, 25, 11);
    c.fillStyle = '#c98f4e'; c.fillRect(-11.4, -19.4, 22.8, 8.8);
    c.fillStyle = '#fff7e0'; c.font = 'bold 6.8px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('精進', 0, -14.8);
  },
  scroll(c) {                         // 掛け軸
    c.strokeStyle = '#8a6a4a'; c.lineWidth = 0.4; c.beginPath(); c.moveTo(0, -27); c.lineTo(0, -33); c.stroke();
    c.fillStyle = '#6e4521'; c.fillRect(-7.6, -27.4, 15.2, 1.9);
    c.fillStyle = '#b5503c'; c.fillRect(-6.8, -25.5, 13.6, 25.6);
    c.fillStyle = '#fffaf0'; c.fillRect(-5.2, -23.9, 10.4, 22.4);
    c.fillStyle = '#6e4521'; c.fillRect(-7.6, 0.2, 15.2, 1.9);
    c.fillStyle = '#2b2b3a'; c.font = 'bold 8.4px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('気', 0, -17); c.fillText('合', 0, -7.6);
  },
  shrine(c) {                         // 神棚
    c.fillStyle = '#8a5a2e'; c.fillRect(-15.5, -10, 31, 2.2);
    c.beginPath(); c.moveTo(-12, -7.8); c.lineTo(-12, -3); c.lineTo(-7.4, -7.8); c.moveTo(12, -7.8); c.lineTo(12, -3); c.lineTo(7.4, -7.8); c.fill();
    c.fillStyle = '#f6e8c0'; c.strokeStyle = INK; c.lineWidth = 0.4;
    c.fillRect(-6.2, -20.5, 12.4, 10.5); c.strokeRect(-6.2, -20.5, 12.4, 10.5);
    c.fillStyle = '#8a6a44'; c.fillRect(-2.1, -17.5, 4.2, 7.5);
    c.fillStyle = '#b5503c'; c.beginPath(); c.moveTo(-10, -20.5); c.lineTo(0, -28.6); c.lineTo(10, -20.5); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = '#efe0a8'; c.lineWidth = 1; c.beginPath(); c.moveTo(-14.5, -21.5); c.quadraticCurveTo(0, -15.5, 14.5, -21.5); c.stroke();
    c.fillStyle = '#ffffff'; c.strokeStyle = '#b8b0a0'; c.lineWidth = 0.25;
    for (const x of [-9.4, 0, 9.4]) { const y = -17.8 + (x === 0 ? 2.4 : 0) + (x === 0 ? 0 : 0.6); c.beginPath(); c.moveTo(x - 1.3, y); c.lineTo(x + 1.3, y); c.lineTo(x + 0.8, y + 2); c.lineTo(x + 1.3, y + 4); c.lineTo(x - 1.3, y + 4); c.lineTo(x - 0.8, y + 2); c.closePath(); c.fill(); c.stroke(); }
    c.fillStyle = '#6fbf6a';
    for (const sx of [-12.6, 12.6]) { c.fillRect(sx - 0.8, -12.6, 1.6, 2.6); c.beginPath(); c.ellipse(sx - 1.4, -14.4, 1.2, 2.2, -0.5, 0, 6.283); c.ellipse(sx + 1.4, -14.8, 1.2, 2.2, 0.5, 0, 6.283); c.ellipse(sx, -16.2, 1.1, 2, 0, 0, 6.283); c.fill(); }
  },
  floor(c, p) {                       // 道場の床板
    const w = p.poly[2] - p.poly[0];
    c.fillStyle = '#f3cf8e'; c.fillRect(-w / 2, -5, w, 2.2);
    c.fillStyle = '#c99a52'; c.fillRect(-w / 2, 3, w, 2);
    c.strokeStyle = '#a9803f'; c.lineWidth = 0.3; c.beginPath(); c.moveTo(0.3, -2.8); c.lineTo(0.3, 3); c.stroke();
  },
  stone(c, p) {                       // 瓦の台（石積み）
    const w = p.poly[2] - p.poly[0], h = p.poly[5] - p.poly[1];
    c.strokeStyle = '#8c8272'; c.lineWidth = 0.35; c.beginPath();
    for (let y = -h / 2 + 4; y < h / 2 - 1; y += 4) { c.moveTo(-w / 2, y); c.lineTo(w / 2, y); }
    c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(-w / 2, -h / 2, w, 1.2);
  },
  tile(c, p) {                        // 瓦のつや
    const q = p.poly;
    c.strokeStyle = 'rgba(240,248,255,0.7)'; c.lineWidth = 0.45; c.beginPath(); c.moveTo(q[0], q[1] + 0.5); c.lineTo(q[2], q[3] + 0.5); c.stroke();
  },
};

// ---- 人（門下生・師範・住人）。足もとが原点、立った高さがおよそ 27（s 倍）----
function drawPerson(c, p, k) {
  const s = p.s, role = p.role, pose = p.pose, kneel = !!p.kneel && pose !== 'run';
  const lw = Math.max(0.5, 0.9 / (k * s));            // 縁取りの太さ（小さく映る時も細くなりすぎない）
  const skin = '#f6cfa6', top = role === 'resident' ? p.col : '#fffdf8';
  const bottom = role === 'master' ? '#4f6aa8' : role === 'resident' ? '#5a5f82' : '#fffdf8';
  const dr = kneel ? 4 : 0, ph = p.ph || 0, sw = Math.sin(ph * 1.7);
  c.save(); c.translate(p.x, p.y); c.scale((p.dir || 1) * s, s);
  if (pose === 'run') c.rotate(0.16);
  c.lineCap = 'round'; c.lineJoin = 'round';
  const line = (w, col, pts) => { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.stroke(); };
  const limb = (w, col, pts) => { line(w + lw * 2, INK, pts); line(w, col, pts); };
  const arm = (hx, hy) => {                          // 肩から手まで（ひじを少し曲げる）
    const sx = 0.2, sy = -18.5 + dr, ex = (sx + hx) / 2 - 1, ey = (sy + hy) / 2 + 2.2;
    limb(2.8, top, [sx, sy, ex, ey, hx, hy]);
    c.fillStyle = skin; c.beginPath(); c.arc(hx, hy, 1.5, 0, 6.283); c.fill();
  };
  // 手の位置（奥の腕・手前の腕）
  let far = [-1.4, -11.5 + dr], near = [1.4, -11 + dr];
  if (pose === 'fold') { far = [3.4, -14.2 + dr]; near = [3, -13.4 + dr]; }
  else if (pose === 'wince') { far = [2.4, -21.6 + dr]; near = [3.4, -22.4 + dr]; }
  else if (pose === 'clap') { const f = Math.sin(ph * 2.2) * 0.8; far = [5.6 + f, -15.6 + dr]; near = [5.8 - f, -15 + dr]; }
  else if (pose === 'gasp') { const f = Math.sin(ph * 2) * 0.6; far = [-5.6, -27.4 + dr + f]; near = [6.6, -27.8 + dr - f]; }
  else if (pose === 'shield') { far = [4.2, -23.2 + dr]; near = [5.4, -24.4 + dr]; }
  else if (pose === 'run') { far = [-5 * sw, -14.5 + dr]; near = [5 * sw, -14.5 + dr]; }
  else if (pose === 'cheer') { const f = Math.sin(ph * 2) * 0.8; far = [-5.2 + f, -31.5]; near = [5.6 - f, -31.5]; }
  arm(far[0], far[1]);
  // 脚
  if (kneel) {                                       // 正座
    limb(3.4, bottom, [-1, -7, 4.6, -2, -4, -1.6]);
  } else if (role === 'master') {                    // 袴
    c.fillStyle = bottom; c.strokeStyle = INK; c.lineWidth = lw;
    c.beginPath(); c.moveTo(-4.6, -12.5); c.lineTo(4.6, -12.5); c.lineTo(5.9, -0.7); c.lineTo(-5.9, -0.7); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 0.4; c.beginPath(); c.moveTo(0, -12); c.lineTo(0.2, -1); c.stroke();
  } else if (pose === 'run') {
    limb(3, bottom, [-1.2, -11, 3 * sw, -6, 5 * sw, -0.6 - Math.max(0, -sw) * 3]);
    limb(3, bottom, [1.2, -11, -3 * sw, -6, -5 * sw, -0.6 - Math.max(0, sw) * 3]);
  } else {
    limb(3, bottom, [-1.6, -11, -2.2, -5.5, -2.5, -0.5]);
    limb(3, bottom, [1.6, -11, 2.2, -5.5, 2.7, -0.5]);
  }
  if (!kneel && role !== 'master') { c.fillStyle = skin; c.beginPath(); c.ellipse(-2.4, -0.4, 1.8, 0.8, 0, 0, 6.283); c.ellipse(2.8, -0.4, 1.8, 0.8, 0, 0, 6.283); c.fill(); }
  // 胴・帯・襟
  c.fillStyle = top; c.strokeStyle = INK; c.lineWidth = lw;
  rr(c, -4.3, -20 + dr, 8.6, 9.6, 2.2); c.fill(); c.stroke();
  if (role !== 'resident') { c.fillStyle = role === 'master' ? '#26262e' : (p.belt || '#e8c23a'); c.fillRect(-4.3, -12.8 + dr, 8.6, 1.9); }
  c.strokeStyle = INK; c.lineWidth = lw * 0.8; c.beginPath(); c.moveTo(-0.6, -20 + dr); c.lineTo(1.2, -15.4 + dr); c.lineTo(3, -20 + dr); c.stroke();
  // 頭
  const look = pose === 'look', hx = 0.6 - (look ? 0.5 : 0), hy = -24.4 + dr - (look ? 0.2 : 0);
  c.fillStyle = skin; c.strokeStyle = INK; c.lineWidth = lw;
  c.beginPath(); c.arc(hx, hy, 3.7, 0, 6.283); c.fill(); c.stroke();
  if (role === 'master') {                           // 白い髪とひげ
    c.fillStyle = '#f4f4f0';
    c.beginPath(); c.arc(hx - 2.6, hy + 0.4, 1.7, 0, 6.283); c.fill();
    c.beginPath(); c.moveTo(hx - 1.4, hy + 3); c.lineTo(hx + 3.3, hy + 3); c.lineTo(hx + 1.2, hy + 8.2); c.closePath(); c.fill(); c.stroke();
  } else {
    c.fillStyle = role === 'resident' ? p.hair : '#2c2a34';
    c.beginPath(); c.arc(hx - 0.3, hy - 0.5, 3.9, Math.PI * 1.02, Math.PI * 2.0); c.fill();
  }
  // 顔（右向き）
  const ey = hy + (look ? -1.5 : -0.3), ex = hx + (look ? 1.2 : 1.8);
  c.fillStyle = '#2b2b3a'; c.strokeStyle = '#2b2b3a'; c.lineWidth = 0.5;
  if (role === 'master') { c.strokeStyle = '#f4f4f0'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(ex - 0.9, ey - 1.1); c.lineTo(ex + 1.5, ey - (pose === 'gasp' ? 1.6 : 0.8)); c.stroke(); c.strokeStyle = '#2b2b3a'; c.lineWidth = 0.5; }
  if (pose === 'wince') {
    c.beginPath(); c.moveTo(ex - 0.6, ey - 0.8); c.lineTo(ex + 1, ey + 0.1); c.lineTo(ex - 0.6, ey + 0.9); c.stroke();
    c.beginPath(); c.moveTo(hx + 0.6, hy + 2.5); c.lineTo(hx + 1.4, hy + 2); c.lineTo(hx + 2.2, hy + 2.5); c.lineTo(hx + 3, hy + 2); c.stroke();
    c.fillStyle = '#7ec8ff'; c.beginPath(); c.ellipse(hx - 3.6, hy - 2.6, 0.6, 1, 0, 0, 6.283); c.fill();
  } else if (pose === 'clap') {
    c.beginPath(); c.arc(ex, ey + 0.4, 0.9, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
    c.beginPath(); c.arc(hx + 1.8, hy + 1.6, 1.3, 0.2, Math.PI - 0.2); c.stroke();
  } else if (pose === 'gasp' || pose === 'shield' || look || pose === 'run') {
    c.beginPath(); c.arc(ex, ey, pose === 'gasp' ? 0.75 : 0.6, 0, 6.283); c.fill();
    c.fillStyle = '#9a2f26'; c.beginPath(); c.ellipse(hx + 1.9, hy + (look ? 1.4 : 1.9), 0.7, pose === 'gasp' ? 1 : 0.8, 0, 0, 6.283); c.fill();
  } else {
    c.beginPath(); c.arc(ex, ey, 0.6, 0, 6.283); c.fill();
    c.strokeStyle = '#9a4a3a'; c.lineWidth = 0.5; c.beginPath(); c.moveTo(hx + 1.1, hy + 2); c.lineTo(hx + 2.6, hy + 2); c.stroke();
  }
  arm(near[0], near[1]);
  c.restore();
}

// ---- 吹き出し（画面での大きさを一定にして、画面の端にはみ出さないよう寄せる）----
function drawBubble(c, v, wx, wy, text, pop) {
  const k = v.k, sx = (wx - v.x0) * k, sy = (wy - v.y0) * k;
  if (sx < -10 || sx > W + 10 || sy < -10 || sy > H + 10) return;
  const fs = 14 + (W >= 700 ? 2 : 0);
  c.save(); c.translate(wx, wy); c.scale(1 / k, 1 / k);
  c.font = 'bold ' + fs + 'px ' + FONT; c.textAlign = 'center'; c.textBaseline = 'middle';
  const tw = c.measureText(text).width, bw = tw + 18, bh = fs + 13;
  const dx = clamp(sx - bw / 2, 6, W - 6 - bw) - (sx - bw / 2);    // 画面の中に収める
  const sc = 0.6 + 0.4 * Math.min(1, pop * 6), by = -9 - bh;
  c.scale(sc, sc);
  c.fillStyle = '#fffdf5'; c.strokeStyle = INK; c.lineWidth = 1.7; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(-6 - dx * 0.0, -9.5); c.lineTo(0, 0); c.lineTo(6, -9.5); c.closePath(); c.fill(); c.stroke();
  rr(c, -bw / 2 + dx, by, bw, bh, 8); c.fill(); c.stroke();
  c.fillStyle = '#fffdf5'; c.fillRect(-5, -10.6, 10, 2.4);                // しっぽの付け根を消す
  c.fillStyle = '#3a2a1c'; c.fillText(text, dx, by + bh / 2 + 0.5);
  c.restore();
}

// ---- 避難先の高台と、遠くから見ている住人 ----
function drawHills(v, tp) {
  const c = cx;
  for (const hl of HILLS) {
    if (hl.x + hl.w < v.x0 || hl.x - hl.w > v.x1) continue;
    c.beginPath(); c.moveTo(hl.x - hl.w, GY);
    for (let x = hl.x - hl.w; x < hl.x + hl.w; x += 3) c.lineTo(x, hillTop(hl, x));
    c.lineTo(hl.x + hl.w, GY); c.closePath();
    c.fillStyle = '#a6dc82'; c.fill(); c.strokeStyle = '#7fb85e'; c.lineWidth = Math.max(0.5, 1 / v.k); c.stroke();
    for (const dx of [-46, -37, 41]) {                 // 小さな木
      const x = hl.x + dx, y = hillTop(hl, x);
      c.fillStyle = '#7a5a3a'; c.fillRect(x - 0.7, y - 4, 1.4, 4);
      c.fillStyle = '#5fae6a'; c.beginPath(); c.moveTo(x - 4, y - 3.5); c.lineTo(x, y - 13); c.lineTo(x + 4, y - 3.5); c.closePath(); c.fill();
    }
  }
}
function drawResidents(v) {
  const c = cx;
  for (let i = 0; i < RESIDENTS.length; i++) {
    const r = RESIDENTS[i];
    if (r.x < v.x0 - 12 || r.x > v.x1 + 12) continue;
    const hop = Math.abs(Math.sin(nowT * 6 + i * 1.7)) * 1.6;
    drawPerson(c, { x: r.x, y: HILL_TOP + 1 - hop, s: 0.95, role: 'resident', col: r.col, hair: r.hair, pose: 'cheer', dir: r.x < 0 ? 1 : -1, ph: nowT * 9 + i }, v.k);
  }
}
// 道場の人たち。連打の間は身構え、見せ場では段階ごとの反応（30-show.js の castPose）
function drawCast(v, sh, inShow, ts) {
  const c = cx, S = sh.stage, o = { x: 0, pose: '', dir: 1, kneel: false, ph: 0 };
  for (let i = 0; i < CAST.length; i++) {
    const a = CAST[i];
    if (inShow) castPose(a, i, S, ts, o);
    else {
      o.x = a.x; o.dir = 1; o.kneel = !!a.kneel;
      const brace = (Game.mode === 'play' || Game.mode === 'finish') && Game.tier() >= 2;
      o.pose = a.role === 'master' ? 'fold' : brace ? 'shield' : 'stand';
      o.x += Math.sin(nowT * 61 + i) * Math.min(0.5, V.kick * 0.15);     // 床がきしむ
    }
    if (o.x < v.x0 - 15 || o.x > v.x1 + 15) continue;
    drawPerson(c, { x: o.x, y: GY, s: a.s, role: a.role, belt: a.belt, pose: o.pose, dir: o.dir, kneel: o.kneel, ph: nowT * 9 + i * 1.3 }, v.k);
  }
}
function drawBubbles(v, sh, ts) {
  for (const b of sh.bubbles) {
    if (ts < b.t0 || ts >= b.t1) continue;
    const sp = bubbleSpot(b.who, sh.stage, ts, v.k);
    if (sp) drawBubble(cx, v, sp.x, sp.y, b.text, ts - b.t0);
  }
}

// ---- 電線（電柱が倒れるまで）----
function drawWires(sh, tp, v) {
  if (!sh._poles) sh._poles = sh.pieces.filter(p => p.g === 'pole');
  const c = cx, P = sh._poles;
  c.strokeStyle = '#3a3a48'; c.lineWidth = Math.max(0.35, 1 / v.k);
  for (const [xa, xb] of [[-190, -130], [220, 280]]) {
    const a = P.find(p => p.x === xa), b = P.find(p => p.x === xb);
    if (!a || !b || tp >= Math.min(a.tb, b.tb)) continue;
    c.beginPath();
    for (const o of [-6, 0, 6]) { c.moveTo(xa + o, GY - 68); c.quadraticCurveTo((xa + xb) / 2 + o, GY - 58, xb + o, GY - 68); }
    c.stroke();
  }
}

// ---- 本人のまわりの光の輪（引いたとき小さくなりすぎないように）----
function haloStrength() {
  const sh = Game.show;
  if (!sh || sh.stage < 3 || !(Game.mode === 'show' || Game.mode === 'over')) return 0;
  return clamp((2.6 - CAMV.k) / 1.4, 0, 1);
}
function drawHalo(K) {
  const str = haloStrength();
  if (str <= 0.01) return;
  const c = cx, k = CAMV.k, x = KX + 2 + K.dx, y = GY - 27 + K.dy, R = Math.max(34, 36 / k), pulse = 1 + Math.sin(nowT * 5) * 0.05;
  c.save();
  const g = c.createRadialGradient(x, y, R * 0.15, x, y, R * 1.2);
  g.addColorStop(0, 'rgba(255,252,226,' + 0.7 * str + ')'); g.addColorStop(0.55, 'rgba(255,228,120,' + 0.3 * str + ')'); g.addColorStop(1, 'rgba(255,228,120,0)');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, R * 1.2, 0, 6.283); c.fill();
  c.lineWidth = 2.6 / k; c.strokeStyle = 'rgba(255,208,60,' + 0.95 * str + ')'; c.setLineDash([R * 0.34, R * 0.2]); c.lineDashOffset = -nowT * R * 0.4;
  c.beginPath(); c.arc(x, y, R * 0.8 * pulse, 0, 6.283); c.stroke();
  c.setLineDash([]); c.lineWidth = 1.4 / k; c.strokeStyle = 'rgba(255,255,255,' + 0.9 * str + ')';
  c.beginPath(); c.arc(x, y, R * 0.8 * pulse + 3.4 / k, 0, 6.283); c.stroke();
  c.restore();
}

// ---- 地層の模様（小石・化石）----
const PEBBLES = (() => {
  const R = mkRng(777), a = [];
  for (let i = 0; i < 150; i++) a.push([-460 + R() * 1000, GY + 14 + R() * 560, 1.2 + R() * 3, 0.8 + R() * 1.7, R()]);
  return a;
})();
function drawStrataArt(v) {
  const c = cx;
  c.fillStyle = 'rgba(255,255,255,0.22)';
  for (const [x, y, rx, ry, q] of PEBBLES) { if (x < v.x0 || x > v.x1 || y > v.y1 + 10) continue; if (q > 0.5) c.fillStyle = 'rgba(80,50,30,0.16)'; else c.fillStyle = 'rgba(255,255,255,0.22)'; c.beginPath(); c.ellipse(x, y, rx, ry, q * 3, 0, 6.283); c.fill(); }
  c.strokeStyle = '#f7ecd2'; c.fillStyle = '#f7ecd2'; c.lineCap = 'round'; c.lineWidth = 2.4;
  // 骨（地層に埋まった化石）
  const bone = (x, y, a, l) => { c.save(); c.translate(x, y); c.rotate(a); c.beginPath(); c.moveTo(-l, 0); c.lineTo(l, 0); c.stroke(); for (const sx of [-l, l]) for (const sy of [-1.6, 1.6]) { c.beginPath(); c.arc(sx, sy, 1.9, 0, 6.283); c.fill(); } c.restore(); };
  bone(-255, 312, 0.25, 12); bone(318, 395, -0.2, 11); bone(-322, 520, 0.1, 13);
  // 巻き貝の化石（足場の柱の断面にも）
  const spiral = (x, y, r) => { c.lineWidth = 1.5; c.beginPath(); for (let a = 0; a < 15; a += 0.4) { const rr0 = r * (0.1 + a / 15); c.lineTo(x + Math.cos(a) * rr0, y + Math.sin(a) * rr0); } c.stroke(); };
  spiral(PX + 4, 292, 9); spiral(296, 470, 10); spiral(-300, 405, 8);
  // 魚の骨
  c.lineWidth = 1.4; c.beginPath(); c.moveTo(-220, 445); c.lineTo(-190, 445); c.stroke();
  for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(-216 + i * 6, 440); c.lineTo(-216 + i * 6, 450); c.stroke(); }
  c.beginPath(); c.arc(-224, 445, 4, 0, 6.283); c.fill();
  c.beginPath(); c.moveTo(-190, 445); c.lineTo(-182, 439); c.lineTo(-182, 451); c.closePath(); c.fill();
}
function drawGrass(v, cp) {
  const c = cx, xa = Math.floor(v.x0 / 5) * 5;
  c.fillStyle = '#6fc457';
  c.beginPath();
  for (let x = xa; x < v.x1 + 5; x += 5) {
    if ((x > DL - 3 && x < DR + 3) || craterTop(x + 2.5, cp) > GY + 0.1) continue;
    c.moveTo(x, GY + 0.6); c.lineTo(x + 1.2, GY - 2.4); c.lineTo(x + 2.4, GY + 0.6);
    c.moveTo(x + 2.6, GY + 0.6); c.lineTo(x + 3.8, GY - 1.8); c.lineTo(x + 5, GY + 0.6);
  }
  c.fill();
}

// ===== 段階 8〜10：宇宙（星・大気・マグマ・地球の外見・割れ目・ひび・月と星の顔・万歳する住人）=====
const STARS = (() => { const R = mkRng(4242), a = []; for (let i = 0; i < 150; i++) a.push([R(), R(), R()]); return a; })();
function drawStars(v, sp) {
  if (sp.a1 < 0.02) return;
  const c = cx, k = v.k, w = v.x1 - v.x0, h = v.y1 - v.y0;
  c.fillStyle = '#fff';
  for (const [u, t, q] of STARS) {
    c.globalAlpha = sp.a1 * (0.45 + 0.55 * Math.abs(Math.sin(nowT * (1 + q * 2) + q * 30)));
    c.beginPath(); c.arc(v.x0 + u * w, v.y0 + t * h, (0.7 + q * 1.3) / k, 0, 6.283); c.fill();
  }
  c.globalAlpha = 1;
}
// 地球のまわりの薄い大気（水色のふち）
function drawAtmo(v, sp) {
  if (sp.eps < 0.3) return;
  const c = cx, Re = PR / sp.eps, ccy = GY + Re, th = Math.max(0.1 * Re, 18 / v.k), a = sp.a1 * (1 - sp.sp);
  if (a < 0.01) return;
  const g = c.createRadialGradient(PX, ccy, Re * 0.99, PX, ccy, Re + th);
  g.addColorStop(0, 'rgba(140,210,255,' + 0.85 * a + ')'); g.addColorStop(1, 'rgba(90,160,255,0)');
  c.fillStyle = g; c.beginPath(); c.arc(PX, ccy, Re + th, 0, 6.283); c.fill();
}
// 割れ目の奥のマグマ（左右の半分より後ろ）
function drawMagma(v, sp) {
  if (sp.magma < 0.01) return;
  const c = cx, Re = PR / Math.max(sp.eps, 0.05), ccy = GY + Re;
  const g = c.createLinearGradient(0, GY, 0, GY + Re * 2);
  g.addColorStop(0, '#fff3a8'); g.addColorStop(0.12, '#ffb83a'); g.addColorStop(0.45, '#ff7a2a'); g.addColorStop(1, '#a8281f');
  c.globalAlpha = Math.min(1, sp.magma * 1.5); c.fillStyle = g; c.beginPath(); c.arc(PX, ccy, Re, 0, 6.283); c.fill(); c.globalAlpha = 1;
}
// 角のない大きな塊（点を結ぶなめらかな閉じた線）
function blob(c, pts, R, ox, oy) {
  const P = pts.map(p => [ox + p[0] * R, oy + p[1] * R]), n = P.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const m0 = mid(P[0], P[1]);
  c.beginPath(); c.moveTo(m0[0], m0[1]);
  for (let i = 1; i <= n; i++) { const p = P[i % n], m = mid(p, P[(i + 1) % n]); c.quadraticCurveTo(p[0], p[1], m[0], m[1]); }
  c.closePath();
}
const LAND = [
  [[-0.5, -0.82], [-0.2, -0.99], [0.18, -1.0], [0.5, -0.82], [0.64, -0.56], [0.35, -0.45], [0.12, -0.6], [-0.12, -0.42], [-0.4, -0.5], [-0.62, -0.62]],
  [[-0.95, -0.1], [-0.7, -0.34], [-0.42, -0.15], [-0.5, 0.2], [-0.72, 0.52], [-0.9, 0.3]],
  [[0.28, 0.02], [0.62, -0.14], [0.9, 0.18], [0.62, 0.56], [0.34, 0.42]],
  [[-0.3, 0.55], [0.05, 0.6], [0.14, 0.88], [-0.18, 0.92]]];
const GCLOUD = [[-0.35, -0.7, 0.2, 0.05], [0.32, -0.3, 0.24, 0.06], [-0.62, 0.08, 0.18, 0.05], [0.1, 0.42, 0.28, 0.06], [0.66, 0.62, 0.16, 0.04], [-0.1, -0.12, 0.16, 0.04]];
// 宇宙から見た地球（青い海と緑の大陸と雲）。glb で下の断面（地層・マグマ）と入れ替わる
function drawGlobe(v, sp) {
  if (sp.glb < 0.01) return;
  const c = cx, Re = PR / Math.max(sp.eps, 0.05), ccy = GY + Re, lw = 3 / v.k;
  c.save(); c.globalAlpha = sp.glb;
  c.beginPath(); c.arc(PX, ccy, Re, 0, 6.283); c.clip();
  let g = c.createRadialGradient(PX - Re * 0.35, ccy - Re * 0.4, Re * 0.1, PX, ccy, Re);
  g.addColorStop(0, '#86d4ff'); g.addColorStop(0.6, '#3b8fe0'); g.addColorStop(1, '#1f5db3');
  c.fillStyle = g; c.fillRect(PX - Re, ccy - Re, 2 * Re, 2 * Re);
  c.lineJoin = 'round'; c.fillStyle = '#6fcb74'; c.strokeStyle = '#3f9a52'; c.lineWidth = lw;
  for (const L of LAND) { blob(c, L, Re, PX, ccy); c.fill(); c.stroke(); }
  c.fillStyle = 'rgba(255,255,255,0.82)';
  for (const [x, y, rx, ry] of GCLOUD) { c.beginPath(); c.ellipse(PX + x * Re, ccy + y * Re, rx * Re, ry * Re, -0.25, 0, 6.283); c.fill(); }
  c.fillStyle = '#f3fbff'; c.beginPath(); c.ellipse(PX, ccy + Re * 0.99, Re * 0.32, Re * 0.07, 0, 0, 6.283); c.fill();
  g = c.createRadialGradient(PX + Re * 0.3, ccy + Re * 0.35, Re * 0.4, PX + Re * 0.3, ccy + Re * 0.35, Re * 1.3);
  g.addColorStop(0, 'rgba(10,20,80,0)'); g.addColorStop(1, 'rgba(10,20,80,0.45)');
  c.fillStyle = g; c.fillRect(PX - Re, ccy - Re, 2 * Re, 2 * Re);
  c.restore();
  c.strokeStyle = 'rgba(255,255,255,' + 0.7 * sp.glb + ')'; c.lineWidth = 2 / v.k; c.beginPath(); c.arc(PX, ccy, Re, 0, 6.283); c.stroke();
}

// ---- 割れ目・ひび（光る線）----
const RIFT = (() => {
  const R = mkRng(555), main = [[PX, GY]];
  let x = PX;
  for (let i = 1; i <= 16; i++) { x += (R() - 0.5) * (i < 3 ? 30 : 160); main.push([x, GY + i * 140]); }
  const br = (i, dir) => { const a = [main[i].slice()]; let bx = main[i][0], by = main[i][1]; for (let j = 0; j < 4; j++) { bx += dir * (80 + R() * 120); by += 60 + R() * 90; a.push([bx, by]); } return a; };
  return [main, br(3, -1), br(5, 1), br(8, -1), br(10, 1)];
})();
const ECR = (() => {
  const R = mkRng(909), out = [];
  [0, -0.45, 0.5, -0.85, 0.9, -1.15, 1.2].forEach((off, j) => {
    let x = PX, y = GY + 4, d = Math.PI / 2 + off;
    const p = [[x, y]];
    for (let i = 0; i < 30; i++) {
      d = j === 0 ? Math.PI / 2 + (R() - 0.5) * 0.4 : d + (R() - 0.5) * 0.9;
      const st = 330 + R() * 200;
      x += Math.cos(d) * st; y += Math.sin(d) * st;
      if (Math.hypot(x - PX, y - PCY) > PR * 0.97) { p.push([x, y]); break; }
      p.push([x, y]);
    }
    out.push(p);
  });
  return out;
})();
function trace(c, pts, frac) {            // 線を長さの frac 分だけたどる
  let len = 0; const seg = [];
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); len += d; }
  let rem = len * clamp(frac, 0, 1);
  c.beginPath(); c.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length && rem > 0; i++) {
    const d = seg[i - 1];
    if (rem >= d) { c.lineTo(pts[i][0], pts[i][1]); rem -= d; }
    else { const u = rem / d; c.lineTo(lerp(pts[i - 1][0], pts[i][0], u), lerp(pts[i - 1][1], pts[i][1], u)); rem = 0; }
  }
}
function glowStroke(c, k, a) {            // 暗い縁・オレンジ・白っぽい芯の 3 重
  c.lineJoin = 'round'; c.lineCap = 'round';
  c.strokeStyle = 'rgba(60,20,8,' + 0.7 * a + ')'; c.lineWidth = 9 / k; c.stroke();
  c.strokeStyle = 'rgba(255,150,40,' + a + ')'; c.lineWidth = 5 / k; c.stroke();
  c.strokeStyle = 'rgba(255,246,170,' + a + ')'; c.lineWidth = 2 / k; c.stroke();
}
function drawRiftCrack(v, sp) {              // 大陸に走る地割れ（開き始めたら消える）
  const a = clamp(1 - sp.open * 1.5, 0, 1);
  if (sp.crack <= 0 || a <= 0.01) return;
  const c = cx;
  RIFT.forEach((p, i) => { const f = i === 0 ? sp.crack : (sp.crack - 0.2 - i * 0.12) * 3; if (f <= 0) return; trace(c, p, f); glowStroke(c, v.k, a); });
}
function drawEarthCracks(v, sp) {             // 地球の表面に広がるひび
  const a = 1 - clamp(sp.sp * 1.5, 0, 1);
  if (sp.ecr <= 0 || a <= 0.01) return;
  const c = cx, Re = PR;
  c.save(); c.beginPath(); c.arc(PX, GY + Re, Re, 0, 6.283); c.clip();
  ECR.forEach((p, j) => { const f = sp.ecr * 1.5 - j * 0.06; if (f <= 0) return; trace(c, p, f); glowStroke(c, v.k, a); });
  c.restore();
}

// ---- 割れた地球の上で万歳している小さな家と住人（画面での大きさは一定）----
const FOLK_COL = ['#ff8a5c', '#5c9cff', '#f2c94c', '#7bd389', '#e07ac0'];
function drawFolk(v, sp) {
  const a = clamp((sp.eps - 0.4) * 2, 0, 1);
  if (a < 0.02) return;
  const c = cx, Re = PR / sp.eps, u = 1.15 / v.k;
  c.save(); c.globalAlpha = a; c.lineJoin = 'round'; c.lineCap = 'round';
  FOLK.forEach(([s, kind], i) => {
    const p = surfPt(s, Re);
    c.save(); c.translate(p.x, p.y); c.rotate(p.a); c.scale(u, u);
    if (kind === 'house') {
      c.fillStyle = '#fff2c8'; c.strokeStyle = INK; c.lineWidth = 1.1;
      c.fillRect(-7, -10, 14, 10); c.strokeRect(-7, -10, 14, 10);
      c.fillStyle = i % 4 === 1 ? '#e4584a' : '#4c7fd9'; c.beginPath(); c.moveTo(-9.5, -10); c.lineTo(0, -18); c.lineTo(9.5, -10); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#b9824a'; c.fillRect(-1.8, -5.5, 3.6, 5.5); c.fillStyle = '#d4f0ff'; c.fillRect(2.6, -8, 3, 3);
    } else {
      const f = Math.sin(nowT * 8 + i * 1.7) * 1.6;
      c.strokeStyle = INK; c.lineWidth = 3.4; c.beginPath(); c.moveTo(-6 + f, -25); c.lineTo(-1, -15); c.lineTo(1, -15); c.lineTo(6 - f, -25); c.moveTo(-1.6, -8); c.lineTo(-2, 0); c.moveTo(1.6, -8); c.lineTo(2, 0); c.stroke();
      c.strokeStyle = FOLK_COL[(i >> 1) % 5]; c.lineWidth = 2; c.beginPath(); c.moveTo(-6 + f, -25); c.lineTo(-1, -15); c.lineTo(1, -15); c.lineTo(6 - f, -25); c.stroke();
      c.fillStyle = FOLK_COL[(i >> 1) % 5]; c.strokeStyle = INK; c.lineWidth = 1; rr(c, -3.4, -16, 6.8, 9, 2); c.fill(); c.stroke();
      c.fillStyle = '#f6cfa6'; c.beginPath(); c.arc(0, -20, 3.4, 0, 6.283); c.fill(); c.stroke();
      c.fillStyle = INK; c.beginPath(); c.arc(-1.2, -20.4, 0.55, 0, 6.283); c.arc(1.2, -20.4, 0.55, 0, 6.283); c.fill();
      c.strokeStyle = '#9a2f26'; c.lineWidth = 0.7; c.beginPath(); c.arc(0, -19, 1.1, 0.1, Math.PI - 0.1); c.stroke();
    }
    c.restore();
  });
  c.restore();
}

// ---- びっくり顔の月と星（宇宙から見たとき）----
function drawFace(c, x, y, r, surprised) {
  c.save(); c.translate(x, y);
  c.fillStyle = '#fff'; c.strokeStyle = INK; c.lineWidth = r * 0.05;
  for (const sx of [-1, 1]) {
    if (surprised) {
      c.fillStyle = '#fff'; c.beginPath(); c.arc(sx * r * 0.3, -r * 0.1, r * 0.19, 0, 6.283); c.fill(); c.stroke();
      c.fillStyle = INK; c.beginPath(); c.arc(sx * r * 0.3, -r * 0.1, r * 0.07, 0, 6.283); c.fill();
    } else { c.fillStyle = INK; c.beginPath(); c.arc(sx * r * 0.3, -r * 0.1, r * 0.06, 0, 6.283); c.fill(); }
  }
  c.strokeStyle = INK; c.lineWidth = r * 0.05;
  if (surprised) { c.fillStyle = '#9a2f26'; c.beginPath(); c.ellipse(0, r * 0.33, r * 0.12, r * 0.19, 0, 0, 6.283); c.fill(); c.stroke(); }
  else { c.beginPath(); c.arc(0, r * 0.18, r * 0.16, 0.2, Math.PI - 0.2); c.stroke(); }
  c.restore();
}
function drawSpaceBuddies(v, sp) {
  if (sp.a1 < 0.6) return;
  const c = cx, sur = sp.ecr > 0.02 || sp.sp > 0, a = clamp((sp.a1 - 0.6) * 2.5, 0, 1), m = MOON, s = STAR;
  c.save(); c.globalAlpha = a;
  const g = c.createRadialGradient(m.x - m.r * 0.3, m.y - m.r * 0.3, m.r * 0.1, m.x, m.y, m.r);
  g.addColorStop(0, '#fffbe6'); g.addColorStop(1, '#e6d9a8');
  c.fillStyle = g; c.strokeStyle = INK; c.lineWidth = m.r * 0.05; c.beginPath(); c.arc(m.x, m.y, m.r, 0, 6.283); c.fill(); c.stroke();
  c.fillStyle = 'rgba(190,170,120,0.55)';
  for (const [dx, dy, r0] of [[-0.5, 0.35, 0.16], [0.5, 0.45, 0.12], [0.15, -0.6, 0.1]]) { c.beginPath(); c.arc(m.x + dx * m.r, m.y + dy * m.r, r0 * m.r, 0, 6.283); c.fill(); }
  drawFace(c, m.x, m.y, m.r, sur);
  c.save(); c.translate(s.x, s.y); c.rotate(Math.sin(nowT * 2) * 0.08);
  c.beginPath();
  for (let i = 0; i < 10; i++) { const r0 = i % 2 ? s.r * 0.5 : s.r, ang = -Math.PI / 2 + i * Math.PI / 5; c.lineTo(Math.cos(ang) * r0, Math.sin(ang) * r0); }
  c.closePath(); c.fillStyle = '#ffe05a'; c.strokeStyle = '#d9a420'; c.lineWidth = s.r * 0.07; c.lineJoin = 'round'; c.fill(); c.stroke();
  drawFace(c, 0, s.r * 0.08, s.r * 0.62, sur);
  c.restore();
  c.restore();
}
