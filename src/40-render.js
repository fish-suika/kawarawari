// ===== 描画（Canvas 2D。世界の座標は「遊ぶ場所の幅 = 100」。カメラで見せ場に合わせて引く）=====
const $ = id => document.getElementById(id);
const cv = $('cv'), cx = cv.getContext('2d');
let W = 0, H = 0, DPR = 1;
let CAMV = viewFor(BASE_CAM, 390, 844);   // 今のカメラが見ている世界の範囲
let nowT = 0;
const RESL = { on: false, x: 0, y: 0, w: 0, h: 0, portrait: true };   // 認定証の置き場所（60-ui.js が測って入れる）
const IDLE = buildShow(0, CFG.seed);      // 連打の間の世界（壊れる前の姿）

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
}

// 配置は 30-show.js（GY・KX・TX…）
const TIER_COL = ['#ffffff', '#fff2a8', '#ffd84a', '#ffa63a', '#ff6a2a', '#ff3d4a', '#e63cc8', '#7a5cff', '#4aa8ff', '#35e0d0', '#fff1a0'];

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
  const target = Game.mode === 'title' ? 12 : (Game.mode === 'show' || Game.mode === 'over') ? 0 : 14 + Math.min(Game.count, CFG.topCount) / CFG.topCount * 38.5;
  V.aura += (target - V.aura) * (1 - Math.exp(-dt * 10));
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i]; s.life += dt;
    if (s.life >= s.max) { sparks.splice(i, 1); continue; }
    s.vy += 60 * dt; s.x += s.vx * dt; s.y += s.vy * dt;
  }
  for (let i = rings.length - 1; i >= 0; i--) { rings[i].life += dt; if (rings[i].life >= rings[i].max) rings.splice(i, 1); }
}

function twoBone(sx, sy, tx, ty, l1, l2, flip) {
  const dx = tx - sx, dy = ty - sy, d0 = Math.hypot(dx, dy) || 0.01;
  const d = clamp(d0, Math.abs(l1 - l2) + 0.1, l1 + l2 - 0.05);
  const ux = dx / d0, uy = dy / d0;
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a)) * (flip ? -1 : 1);
  return { ex: sx + ux * a + uy * h, ey: sy + uy * a - ux * h, hx: sx + ux * d, hy: sy + uy * d };
}

// ---- 空・雲・太陽・裏山の芯 ----
const CLOUDS = [[-200, -110, 1], [110, -95, 1.3], [300, -150, 0.9], [-60, -190, 1.1], [-330, -40, 1.2], [420, -60, 1]];

function drawSky(v, sp) {
  const c = cx, a1 = sp.a1, a2 = sp.a2, disc = sp.eps > 0.05;
  const g = c.createLinearGradient(0, v.y0, 0, GY);
  g.addColorStop(0, a1 > 0 ? mix('#7cc8f2', '#070b24', a1) : '#7cc8f2'); g.addColorStop(1, a2 > 0 ? mix('#f2fbff', '#070b24', a2) : '#f2fbff');   // 宇宙の色は地面の下と同じ色に行き着く（継ぎ目の線が出ない）
  c.fillStyle = g; c.fillRect(v.x0 - 5, v.y0 - 5, v.x1 - v.x0 + 10, GY - v.y0 + 6);
  c.fillStyle = disc ? '#070b24' : '#3a2a22'; c.fillRect(v.x0 - 5, GY - 1, v.x1 - v.x0 + 10, v.y1 - GY + 6);   // 地面の下：平らなうちは地面が覆う（穴の奥は drawCavity）／引いたら宇宙
  if (disc) { drawStars(v, sp); drawAtmo(v, sp); }
  if (a2 > 0.97) return;
  c.globalAlpha = 1 - a2;
  // 太陽
  const sg = c.createRadialGradient(330, -150, 6, 330, -150, 70);
  sg.addColorStop(0, 'rgba(255,244,170,0.95)'); sg.addColorStop(0.4, 'rgba(255,236,140,0.4)'); sg.addColorStop(1, 'rgba(255,236,140,0)');
  c.fillStyle = sg; c.beginPath(); c.arc(330, -150, 70, 0, 6.283); c.fill();
  c.fillStyle = '#ffe98a'; c.beginPath(); c.arc(330, -150, 17, 0, 6.283); c.fill();
  // 雲
  c.fillStyle = '#ffffffd8';
  for (const [x, y, s] of CLOUDS) {
    c.beginPath();
    c.ellipse(x, y, 34 * s, 9 * s, 0, 0, 6.283); c.ellipse(x - 20 * s, y + 3 * s, 20 * s, 7 * s, 0, 0, 6.283); c.ellipse(x + 22 * s, y + 2 * s, 24 * s, 8 * s, 0, 0, 6.283);
    c.ellipse(x - 6 * s, y - 6 * s, 16 * s, 8 * s, 0, 0, 6.283); c.ellipse(x + 12 * s, y - 4 * s, 12 * s, 7 * s, 0, 0, 6.283);
    c.fill();
  }
  // 裏山の芯（山が割れた隙間から見える暗い部分）
  c.fillStyle = '#5f957f';
  c.beginPath(); c.moveTo(MT_L[0], MT_L[1]);
  for (let i = 2; i < MT_L.length - 2; i += 2) c.lineTo(MT_L[i], MT_L[i + 1]);
  for (let i = 2; i < MT_R.length - 2; i += 2) c.lineTo(MT_R[i], MT_R[i + 1]);
  c.closePath(); c.fill();
  c.globalAlpha = 1;
}

// 地面の上端を決める点の x（地面の断面の輪郭）。引いたとき（disc）は地球の丸みを足すので細かく刻む
function groundXs(v, cp, disc) {
  const xL = v.x0 - 30, xR = v.x1 + 30, xs = [xL, xR];
  if (disc) { const st = Math.max(6, (xR - xL) / 240); for (let x = xL; x < xR; x += st) xs.push(x); }
  if (cp > 0) {
    for (let x = CR.x - CR.R - 6; x <= CR.x + CR.R + 6; x += 6) xs.push(x);
    for (const e of [CR.x - CFL, CR.x + CFL]) xs.push(e - 0.001, e + 0.001);   // 穴の底の平らな部分の端
  }
  return xs.filter(x => x >= xL && x <= xR).sort((a, b) => a - b);
}
// 丸み：クレーターの中心 (PX, GY) の高さを基準に、地球の円（中心 x=EX）に沿って地面が下がる量。Re：そのときの地球の半径（0 なら平ら）
const sagOf = Re => {
  if (!Re) return () => 0;
  const cy = cyOf(Re);
  return x => { const d = x - EX; return cy - GY - (Math.abs(d) < Re * 0.9995 ? Math.sqrt(Re * Re - d * d) : 0); };
};
// 地層の下の深いところ（半径に対する割合・色）：地球の断面。引いたときだけ見える
const DEEP = [[0.72, '#9c5a3c'], [0.55, '#d06a38'], [0.34, '#ff9a3a'], [0.17, '#ffe27a']];

// クレーターの穴の中（奥の壁）：縁は明るく、奥ほど暗い。地層の線がうっすら見える。穴のふちの内側は影で、えぐれて見える
function drawCavity(v, cp, sp) {
  if (cp <= 0) return;
  const c = cx, disc = sp.eps > 0.05, Re = disc ? PR / sp.eps : 0, sag = sagOf(Re);
  const xs = groundXs(v, cp, false).filter(x => x >= CR.x - CR.R - 7 && x <= CR.x + CR.R + 7);
  if (xs.length < 2) return;
  const xa = xs[0], xb = xs[xs.length - 1];
  c.save(); c.beginPath();
  xs.forEach((x, i) => (i ? c.lineTo(x, GY + sag(x)) : c.moveTo(x, GY + sag(x))));
  for (let i = xs.length - 1; i >= 0; i--) c.lineTo(xs[i], craterTop(xs[i], cp) + sag(xs[i]));
  c.closePath(); c.clip();
  const g = c.createLinearGradient(0, GY, 0, GY + CR.D + 30);
  g.addColorStop(0, '#d4b283'); g.addColorStop(0.22, '#aa8460'); g.addColorStop(0.5, '#6c4d38'); g.addColorStop(0.8, '#3d2b24'); g.addColorStop(1, '#271b1c');
  c.fillStyle = g; c.fillRect(xa - 2, GY - 12, xb - xa + 4, CR.D + 90);
  c.lineWidth = 1.6 / v.k;
  for (let i = 1; i < STRATA.length; i++) {            // 奥の壁の地層の線
    const y = STRATA[i][0];
    c.strokeStyle = 'rgba(30,16,8,0.30)'; c.beginPath(); c.moveTo(xa, y); c.lineTo(xb, y); c.stroke();
    c.strokeStyle = 'rgba(255,230,190,0.10)'; c.beginPath(); c.moveTo(xa, y + 1.6 / v.k); c.lineTo(xb, y + 1.6 / v.k); c.stroke();
  }
  c.beginPath();                                      // 穴の縁（掘れた地面との境）に落ちる影
  for (let i = xs.length - 1; i >= 0; i--) { const x = xs[i], y = craterTop(x, cp) + sag(x); if (i === xs.length - 1) c.moveTo(x, y); else c.lineTo(x, y); }
  c.lineJoin = 'round'; c.strokeStyle = 'rgba(18,8,6,0.40)'; c.lineWidth = Math.min(30 / v.k, 30); c.stroke();
  c.restore();
}

// 地面の断面：地層の帯、道場の下の階、クレーター（本人は穴の底に立つ）。引いたとき（sp.eps > 0.05）は地球の丸みと断面（円の層）になる
function drawGround(v, cp, sp) {
  const c = cx, disc = sp.eps > 0.05, Re = disc ? PR / sp.eps : 0, ccy = disc ? cyOf(Re) : 0, sag = sagOf(Re);
  const xL = v.x0 - 30, xR = v.x1 + 30, yB = v.y1 + 40;
  const pts = groundXs(v, cp, disc).map(x => [x, craterTop(x, cp) + sag(x)]);
  c.save(); c.beginPath();
  pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
  c.lineTo(xR, yB); c.lineTo(xL, yB); c.closePath(); c.clip();
  if (!disc) {
    for (let i = 0; i < STRATA.length; i++) {
      const y0 = STRATA[i][0], y1 = i + 1 < STRATA.length ? STRATA[i + 1][0] : yB;
      c.fillStyle = STRATA[i][1]; c.fillRect(xL, y0, xR - xL, Math.max(y1, y0 + 1) - y0 + 0.5);
    }
  } else {
    const dk = (r, col) => { c.fillStyle = col; c.beginPath(); c.arc(EX, ccy, r, 0, 6.283); c.fill(); };
    for (const [y, col] of STRATA) dk(Re - (y - GY), col);
    for (const [f, col] of DEEP) dk(Re * f, col);
  }
  if (v.x1 - v.x0 < 2500) drawStrataArt(v);
  // 下の階（道場の真下の部屋）
  c.fillStyle = '#b89a72'; c.fillRect(DL, GY, DR - DL, BY - GY);
  c.fillStyle = '#d8c096'; c.fillRect(DL, GY, DR - DL, 3);
  c.fillStyle = '#8f7452';
  for (let x = DL + 17; x < DR; x += 34) c.fillRect(x - 1, GY, 2, BY - GY);
  c.fillRect(DL, 176, DR - DL, 1.6);
  c.fillStyle = '#e0b068'; c.fillRect(DL, BY, DR - DL, 9);
  c.fillStyle = '#9a7438'; c.fillRect(DL, BY, DR - DL, 1.2);
  if (cp > 0) {   // 穴のふち（えぐれた土）の影と輪郭線。地面の内側だけに見える
    const cr = pts.filter(p => p[0] >= CR.x - CR.R - 7 && p[0] <= CR.x + CR.R + 7);
    c.beginPath(); cr.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
    c.lineJoin = 'round';
    c.strokeStyle = 'rgba(48,26,14,0.26)'; c.lineWidth = Math.min(16 / v.k, 24); c.stroke();
    c.strokeStyle = 'rgba(48,26,14,0.32)'; c.lineWidth = Math.min(7 / v.k, 13); c.stroke();
    c.strokeStyle = '#45291a'; c.lineWidth = 3.2 / v.k; c.stroke();
  }
  c.restore();
  if (!disc) drawGrass(v, cp);
}

// 破片・建物・山など（lay：奥から手前）。時刻 tp の姿勢は 30-show.js の poseAt
const po = { x: 0, y: 0, a: 0, al: 1, s: 1 };
function drawPieces(sh, lay, tp, jit) {
  const c = cx, amp = 0.35 + Math.min(Game.count, CFG.topCount) / CFG.topCount * 0.84;
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
      if (p.edge) { c.strokeStyle = p.edge; c.lineWidth = Math.min(1.1, Math.max(0.35, 0.8 / CAMV.k)); c.stroke(); }
      if (p.dec) for (const d of p.dec) { c.fillStyle = d[4]; c.fillRect(d[0], d[1], d[2], d[3]); }
      if (p.decp) for (const d of p.decp) { c.fillStyle = d.col; c.beginPath(); c.moveTo(d.pts[0], d.pts[1]); for (let i = 2; i < d.pts.length; i += 2) c.lineTo(d.pts[i], d.pts[i + 1]); c.closePath(); c.fill(); }
      if (p.deco) { const f = DECO[p.deco]; if (f) f(c, p); }
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
  if (t >= 1) {   // 段階と同じ区切りで一段派手に：光の筋
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
    return { dx: k.dx, dy: k.dy, tx: k.tx, ty: k.ty, face: k.face, t, by: 0, pain: sh.stage === 0, flip: false };
  }
  let tx = KX + 11, ty = 76 + (m === 'play' ? -V.bounce * 1.5 : 0);
  if (m === 'title') { tx = KX + 27; ty = 99; }   // 構え（ひじを下げて拳を前に）
  if (m === 'ready') { tx = KX + 12; ty = 84; }
  if (m === 'finish') {
    const e = Math.pow(clamp(Game.finT / 0.12, 0, 1), 2);
    tx = lerp(KX + 11, 61, e); ty = lerp(76, TB - CFG.tiles * TP - 3, e);
  }
  const by = V.bounce * 1.2 + (m === 'play' ? Math.sin(nowT * 30) * 0.15 * Math.min(1, Game.count / 20) : 0);
  return { dx: 0, dy: 0, tx, ty, face: m === 'play' || m === 'finish' ? 'shout' : m === 'title' ? 'serious' : 'calm', t: nowT, by, pain: false, flip: m === 'title' };
}

function drawKarateka() {
  const c = cx, K = karaView();
  const skin = mix('#f6cfa6', '#ff7a5a', clamp(Game.count / CFG.topCount, 0, 1));
  const kz = CAMV.k, hs0 = haloStrength();
  const sc = hs0 > 0 && Game.show ? heroScale(Game.show.stage, kz) : 1;   // 引いたとき大きく（宇宙まで引いたら、見つけられる大きさ・穴の底に収まる大きさまで）
  const ow = Math.min(2.2, Math.max(0.7, 1.1 / kz));                                          // 縁取りの太さ（引いても見える）
  c.save(); c.translate(K.dx, K.dy + K.by);
  if (sc > 1) { c.translate(KX + 1, GY); c.scale(sc, sc); c.translate(-(KX + 1), -GY); }
  const hs = haloStrength();
  if (hs > 0.05) { c.shadowColor = 'rgba(255,255,255,' + 0.95 * hs + ')'; c.shadowBlur = 9 * DPR * hs; }
  // 影
  c.save(); c.translate(0, -K.by); c.fillStyle = '#0003'; c.beginPath(); c.ellipse(KX + 1, GY + 1.5, 15, 2.6, 0, 0, 6.283); c.fill(); c.restore();
  c.lineCap = 'round'; c.lineJoin = 'round';
  const white = '#fffdf6', edge = '#7a604a';
  const limb = (w, pts) => {
    for (const [lw, col] of [[w + ow * 2, edge], [w, white]]) {
      c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.moveTo(pts[0], pts[1]);
      for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
      c.stroke();
    }
  };
  // 脚（馬立ち）
  limb(7, [KX - 3, 122, KX - 10, GY - 1]); limb(7, [KX + 5, 122, KX + 12, GY - 1]);
  c.fillStyle = skin; c.beginPath(); c.ellipse(KX - 11, GY - 0.3, 4, 1.6, 0, 0, 6.283); c.ellipse(KX + 13, GY - 0.3, 4, 1.6, 0, 0, 6.283); c.fill();
  // 後ろの腕（ふだんは腰に。痛いときは手首を押さえる）
  if (K.pain) { const bk = twoBone(KX - 5, 105, K.tx - 1, K.ty + 2, 20, 20); limb(5.4, [KX - 5, 105, bk.ex, bk.ey, bk.hx, bk.hy]); }
  else limb(5.4, [KX - 5, 105, KX - 11, 114, KX - 5, 118]);
  // 胴
  c.fillStyle = white; c.strokeStyle = edge; c.lineWidth = Math.max(0.7, ow * 0.7);
  rr(c, KX - 8, 99, 17, 25, 4.5); c.fill(); c.stroke();
  c.strokeStyle = edge; c.lineWidth = 0.6; c.beginPath(); c.moveTo(KX - 1, 99); c.lineTo(KX + 4, 110); c.lineTo(KX + 7, 99); c.stroke();   // 襟
  c.fillStyle = '#26262e'; c.fillRect(KX - 8.3, 118.5, 17.6, 3.2);   // 黒帯
  // 頭
  const hx = KX + 1.5, hy = 91;
  c.fillStyle = skin; c.strokeStyle = edge; c.lineWidth = Math.max(0.7, ow * 0.7);
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
  const arm = twoBone(KX + 3, 104, K.tx, K.ty, 22, 22, K.flip);
  limb(5.4, [KX + 3, 104, arm.ex, arm.ey, arm.hx, arm.hy]);
  c.fillStyle = skin; c.strokeStyle = edge; c.lineWidth = Math.max(0.5, ow * 0.6);
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

// 世界のひとまとまり（奥の壁・山・家・地面・人・瓦…）。core：本人（オーラ・光の輪）を地面の手前に描く
function drawScene(v, sh, sp, inShow, ts, tp, jit, core) {
  const c = cx, wa = sp.world, cp = craterAt(sh.stage, ts);
  drawCavity(v, cp, sp);              // 穴の奥の壁（世界が見えなくなっても、穴は地面の一部として残る）
  c.save(); if (wa < 1) c.globalAlpha = wa;
  if (wa > 0.01) {
    drawHills(v, tp);
    drawPieces(sh, 0, tp, jit);       // 裏山
    drawResidents(v);
    drawPieces(sh, 1, tp, jit);       // 家・電柱
    drawWires(sh, tp, v);
    drawPieces(sh, 2, tp, jit);       // 道場の奥の壁・柱
  }
  c.restore();
  drawGround(v, cp, sp);
  if (sp.glb > 0.01) { drawGlobe(v, sp); drawCavity(v, cp, sp); }   // 地球の外見に切り替わっても、本人の立つ穴は見える
  if (sp.ecr > 0.001) drawEarthCracks(v, sp);
  c.save(); if (wa < 1) c.globalAlpha = wa;
  if (wa > 0.01) drawCast(v, sh, inShow, ts);
  c.restore();
  if (core) { drawAura(); drawHalo(karaView()); drawKarateka(); }
  c.save(); if (wa < 1) c.globalAlpha = wa;
  if (wa > 0.01) {
    drawPieces(sh, 3, tp, jit);       // 瓦・台・床
    drawPieces(sh, 4, tp, jit);       // 屋根・外の壁
    drawPieces(sh, 5, tp, jit);       // 砂ぼこり・土
  }
  c.restore();
  if (sp.eps > 0.4) drawFolk(v, sp);
}

function render() {
  const c = cx, m = Game.mode, sh = Game.show || IDLE;
  const inShow = !!Game.show && (m === 'show' || m === 'over');
  const ts = inShow ? (m === 'show' ? Game.showT : sh.dur) : 0;                                   // カメラ・演出の時刻
  const tp = inShow ? (m === 'show' ? Game.showT : sh.dur + Math.min(Game.overT, 3)) : 0;          // 破片の時刻（結果のあとも着地まで進む）
  let cam = inShow ? camAt(sh.stage, ts) : BASE_CAM;
  const shk = inShow ? shakeAt(sh, ts, { x: 0, y: 0 }) : { x: 0, y: 0 };
  if (m === 'over' && RESL.on) {          // 認定証が出るとき、絵をずらして本人が認定証にかぶらないように
    const u = smooth((Game.overT - CFG.certDelay) / 0.55);
    if (u > 0) {
      const sft = resultShift(sh.stage, cam, W, H, RESL), zf = lerp(1, 1 / sft.z, u), c2 = { cx: cam.cx, cy: cam.cy, w: cam.w * zf, h: cam.h * zf }, kc = viewFor(c2, W, H).k;
      cam = { cx: cam.cx - sft.x * u / kc, cy: cam.cy - sft.y * u / kc, w: c2.w, h: c2.h };
    }
  }
  const v = CAMV = viewFor(cam, W, H);
  const sp = inShow ? spaceAt(sh.stage, ts) : NOSP;     // 段階 8〜10 の宇宙の状態（それ以外は何もなし）
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, cv.width, cv.height);
  c.setTransform(DPR * v.k, 0, 0, DPR * v.k, DPR * (W / 2 - cam.cx * v.k + shk.x), DPR * (H / 2 - cam.cy * v.k + shk.y));
  const jit = !inShow;
  drawSky(v, sp);
  if (sp.eps > 0.05) { drawSpaceBuddies(v, sp); drawMagma(v, sp); }
  const split = sp.eps > 0.05 && (sp.ang > 0.0005 || sp.sp > 0.0005);
  if (!split) drawScene(v, sh, sp, inShow, ts, tp, jit, true);
  else {                                  // 大陸（地球）が x=EX で左右の半分に割れて動く。本人はクレーターの底に立ったまま、左の半分といっしょに動く
    const ov = 1.2 / v.k, half = side => { const h = halfXf(sp, side); c.translate(h.dx, 0); c.translate(EX, PCY); c.rotate(h.rot); c.translate(-EX, -PCY); };
    for (const side of [-1, 1]) {
      c.save(); half(side);
      c.beginPath();
      if (side < 0) c.rect(EX - 4e5, PCY - 4e5, 4e5 + ov, 8e5); else c.rect(EX, PCY - 4e5, 4e5, 8e5);   // 左は継ぎ目が見えないよう少し重ねる
      c.clip();
      drawScene(v, sh, sp, inShow, ts, tp, jit, false);
      c.restore();
    }
    c.save(); half(-1);
    drawAura(); drawHalo(karaView()); drawKarateka();
    c.restore();
  }
  if (sp.crack > 0) drawRiftCrack(v, sp);
  drawSparks();
  if (inShow) drawBubbles(v, sh, ts);
  const f = Math.min(0.85, V.flash + (inShow ? flashAt(sh, ts) : 0));
  if (f > 0.01) { c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = 'rgba(255,255,255,' + f + ')'; c.fillRect(0, 0, cv.width, cv.height); }
}
