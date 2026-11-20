// ===== 破壊の見せ場（画面を使わない：世界の配置・破片・カメラ・時刻）=====
// 世界の座標は「遊ぶ場所の幅 = 100」の単位。段階 0 の画面は x 0〜100・y 0〜177.78。y は下向き
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };

const GY = 140, BY = 215;                              // 地面（道場の床）の高さ / 下の階の床の高さ
const KX = 38;                                         // 空手家の x
const TX = 74, TW = 30, TP = 3, TH = 2.7, TB = 128;    // 瓦の中心x・幅・ピッチ・厚み・台の上の y
const DL = -70, DR = 160;                              // 道場の内側の左右
const HX0 = -12, HX1 = 118;                            // 段階 3 で床が抜ける範囲
const PX = KX + 1, PW = 42;                            // 最後に残る足場の柱（中心x・幅）
const CR = { x: PX, R: 230, D: 300 };                  // クレーター（中心x・半径・深さ）
const GRAV = 700;
const DROP_T = 1.1;                                    // 床が抜けて、床に載っていた物が落ちる時刻
const FALL_T = 1.0;                                    // 本人が下の階へ落ち始める時刻

// 段階ごとのカメラ（見たい範囲の中心と大きさ。画面の縦横比に合わせて倍率を決める）
const BASE_CAM = { cx: 50, cy: 88.89, w: 100, h: 177.78 };
const CAMS = [BASE_CAM, BASE_CAM, BASE_CAM,
  { cx: 50, cy: 128, w: 150, h: 225 },       // 3 床が抜ける・下の階
  { cx: 0, cy: 85, w: 440, h: 300 },         // 4 道場の建物（外へ逃げた門下生も入る）
  { cx: 45, cy: 60, w: 760, h: 420 },        // 5 町内
  { cx: 45, cy: 15, w: 800, h: 470 },        // 6 裏山
  { cx: 39, cy: 215, w: 820, h: 560 }];      // 7 クレーター
// 各段階で「画面に入っていてほしい範囲」（検証でカメラが覆っているか確かめる）
const EXTENT = [
  { x0: 10, x1: 100, y0: 60, y1: 150 }, { x0: 10, x1: 100, y0: 60, y1: 150 }, { x0: 10, x1: 100, y0: 60, y1: 150 },
  { x0: -12, x1: 118, y0: 60, y1: 225 },
  { x0: -92, x1: 182, y0: -42, y1: 225 },
  { x0: -300, x1: 365, y0: 60, y1: 225 },
  { x0: -260, x1: 350, y0: -210, y1: 225 },
  { x0: CR.x - CR.R, x1: CR.x + CR.R, y0: 60, y1: GY + CR.D }];
// 裏山（左半分・右半分。ぎざぎざの稜線）
const MT_L = [-260, 140, -190, 50, -130, -40, -85, -95, -40, -150, 10, -185, 45, -210, 45, 140];
const MT_R = [45, -210, 80, -170, 135, -110, 190, -40, 255, 40, 350, 140, 45, 140];
const STRATA = [[GY, '#86d06a'], [GY + 7, '#dcb47c'], [190, '#cb985e'], [255, '#bb8761'], [330, '#aa876c'], [400, '#c2a88e'], [470, '#98795f'], [560, '#806853'], [700, '#6e5a4c']];

// ---- 道場の人たち（師範・門下生）と、避難した住人。位置と動作は時刻だけで決まる ----
const CAST = [
  { id: 'm', role: 'master', x: 8, s: 1.12 },
  { id: 's1', role: 'student', x: 18.5, s: 0.95, belt: '#e8c23a', kneel: true },
  { id: 's2', role: 'student', x: -5, s: 1.0, belt: '#5fb36a' },
  { id: 's3', role: 'student', x: -14, s: 0.95, belt: '#e07a5f' },
  { id: 's4', role: 'student', x: -24, s: 1.0, belt: '#5f8fe0' },
];
const FLEE_T = 0.62;                        // 床が抜ける前に、門下生が外へ逃げ始める時刻
const fleeX = i => -165 - 7 * i;            // 逃げた先（道場の外。崩れた物が落ちる範囲より外）
const HILLS = [{ x: -300, w: 62, h: 58 }, { x: 380, w: 62, h: 58 }];   // 住人が避難した高台（倒れた家より高い）
const RESIDENTS = [{ x: -311, col: '#ff8a5c', hair: '#3a2a1c' }, { x: -289, col: '#5c9cff', hair: '#7a4a24' },
  { x: 369, col: '#f2c94c', hair: '#2a2a2a' }, { x: 391, col: '#7bd389', hair: '#5a3a24' }];
const HILL_TOP = GY - 58;
function hillTop(hl, x) {
  const d = Math.abs(x - hl.x);
  if (d >= hl.w) return GY;
  return GY - hl.h * (1 - smooth(Math.max(0, (d - 22) / (hl.w - 22))));
}
// 時刻 t の門下生・師範の姿（段階 S の見せ場）。o に x・pose・dir・kneel・ph を書く
function castPose(a, i, S, t, o) {
  const m = a.role === 'master';
  o.x = a.x; o.pose = 'stand'; o.dir = 1; o.kneel = !!a.kneel; o.ph = t * 9 + i * 1.3;
  if (S === 0) { o.pose = m ? 'fold' : (t > 0.15 ? 'wince' : 'stand'); return o; }
  if (S === 1) { if (!m && i % 2 === 1 && t > 0.45 && (t * 3 + i * 0.37) % 1 < 0.3) o.pose = 'clap'; return o; }
  if (S === 2) { if (t > 0.62) o.pose = 'gasp'; return o; }
  const t0 = FLEE_T + i * 0.04, u = clamp((t - t0) / 0.75, 0, 1), fx = fleeX(i);
  if (t < t0) { if (t > 0.45) o.pose = 'gasp'; return o; }
  o.kneel = false; o.x = lerp(a.x, fx, u); o.dir = -1;
  if (u < 1) { o.pose = 'run'; return o; }
  o.dir = 1; o.pose = t < 1.6 ? 'shield' : 'look';
  if (S >= 5) { const tr = 2.0 + i * 0.03; if (t >= tr) { o.x = fx - 250 * (t - tr); o.pose = 'run'; o.dir = -1; } }
  return o;
}
// 段階ごとの吹き出し（誰が・何と・いつから・いつまで）。最後の吹き出しは結果のあとも残る
function bubblesFor(S) {
  const b = [], B = (who, text, t0, t1) => b.push({ who, text, t0, t1 });
  if (S === 0) B('m', '……次', 0.6, Infinity);
  else if (S === 1) { B('s3', 'パチ…', 0.45, 0.85); B('s1', 'パチ…パチ', 0.9, Infinity); }
  else if (S === 2) B('s1', 'おおお……！', 0.7, Infinity);
  else B('s1', 'おおっ！', 0.45, 0.68);
  if (S >= 4) B('s2', '屋根が……！', 1.8, S === 4 ? Infinity : 2.05);
  if (S >= 5) B('r0', 'うちが……', 2.7, S === 5 ? Infinity : 3.05);
  if (S >= 6) B('r3', '山が……', 3.1, S === 6 ? Infinity : 3.5);
  if (S >= 7) B('r2', '……破門', 3.5, Infinity);
  return b;
}
// 吹き出しの出どころ（頭の上の世界座標）。見えない・まだいないときは null
function bubbleSpot(who, S, t) {
  const o = { x: 0, pose: '', dir: 1, kneel: false, ph: 0 };
  if (who[0] === 'r') { const r = RESIDENTS[+who[1]]; return { x: r.x, y: HILL_TOP - 30 }; }
  const i = CAST.findIndex(a => a.id === who), a = CAST[i];
  castPose(a, i, S, t, o);
  return { x: o.x, y: GY - (o.kneel ? 22 : 29) * a.s - 1 };
}

// 結果の認定証（DOM）の置き場所。画面 W×H px、認定証の縦横比 ratio（高さ/幅）
function certBox(W, H, ratio) {
  if (H >= W * 0.95) {                     // 縦：下に寄せる（画面の高さの 6 割まで）
    const pad = 14, w = Math.min(W - pad * 2, 440, H * 0.6 / ratio), h = w * ratio;
    return { portrait: true, w, h, x: (W - w) / 2, y: H - h - pad };
  }
  const pad = 14, w = Math.max(160, Math.min(W * 0.46, 460, (H - pad * 2) / ratio)), h = w * ratio;   // 横：右側
  return { portrait: false, w, h, x: W - w - pad, y: (H - h) / 2 };
}
// 認定証より上に見せたい一番下の高さ（世界の y）。クレーターの段階は穴の底まで、ほかは本人の足もと（影まで）
const resultBottom = S => (S >= 7 ? GY + CR.D + 4 : (S >= 3 ? BY : GY) + 7);
// 認定証が出るとき、見せ場の最後の絵が認定証にかぶらないよう絵をずらす量（画面 px。負＝上／左へ）。cam は見せ場の最後のカメラ
function resultShift(S, cam, W, H, box) {
  const v = viewFor(cam, W, H), fy = S >= 3 ? BY : GY;
  const footY = H / 2 + (resultBottom(S) - cam.cy) * v.k, headY = H / 2 + (fy - 64 - cam.cy) * v.k;
  if (box.portrait) return { x: 0, y: Math.max(Math.min(0, box.y - 18 - footY), 26 - headY) };   // 足もとが認定証の上に出るまで。頭は画面内に
  const sx = S >= 3 ? KX + 1 : 62, px = W / 2 + (sx - cam.cx) * v.k;
  return { x: Math.min(0, (box.x - 12) / 2 - px), y: 0 };
}

// 乱数（シード付き。同じシードなら同じ壊れ方）
function mkRng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// カメラが見ている世界の範囲（画面 W×H px に収める倍率 k = px/世界単位）
function viewFor(cam, W, H) {
  const k = Math.min(W / cam.w, H / cam.h), hw = W / (2 * k), hh = H / (2 * k);
  return { k, x0: cam.cx - hw, x1: cam.cx + hw, y0: cam.cy - hh, y1: cam.cy + hh };
}
// 見せ場の時刻 t のカメラ（段階が上がるたびに一段引く）
function camAt(S, t) {
  let a = BASE_CAM, b = BASE_CAM, u = 1;
  for (let k = 3; k <= S; k++) {
    if (t < CFG.camAt[k]) break;
    a = CAMS[k - 1]; b = CAMS[k]; u = smooth((t - CFG.camAt[k]) / CFG.camDur[k]);
  }
  const lg = (p, q) => Math.exp(lerp(Math.log(p), Math.log(q), u));
  return { cx: lerp(a.cx, b.cx, u), cy: lerp(a.cy, b.cy, u), w: lg(a.w, b.w), h: lg(a.h, b.h) };
}
// クレーターの進み具合（0〜1）
function craterAt(S, t) {
  if (S < 7) return 0;
  return smooth((t - CFG.craterT[0]) / (CFG.craterT[1] - CFG.craterT[0]));
}
// 地面の上端（クレーターで掘れた後。足場の柱だけ残る）
function craterTop(x, cp) {
  const u = (x - CR.x) / CR.R;
  let y = GY + (cp > 0 && Math.abs(u) < 1 ? cp * CR.D * Math.pow(1 - u * u, 0.75) : 0);
  if (x > PX - PW / 2 && x < PX + PW / 2) y = Math.min(y, BY);
  return y;
}
// 画面の揺れ（px）・光（0〜）
function shakeAt(sh, t, o) {
  let a = 0;
  for (const s of sh.shakes) if (t >= s.t && t < s.t + s.d) { const u = 1 - (t - s.t) / s.d; a += s.a * u * u; }
  o.x = Math.sin(t * 57) * a; o.y = Math.cos(t * 43) * a;
  return o;
}
function flashAt(sh, t) {
  let f = 0;
  for (const s of sh.flashes) if (t >= s.t) f += s.a * Math.exp(-(t - s.t) * 7);
  return f;
}
// 今出す大きな文字（出ていなければ -1）
function captionAt(sh, t) {
  let r = -1;
  for (let i = 0; i < sh.caps.length; i++) if (sh.caps[i].t <= t) r = i;
  return r;
}

// 空手家の動き：腕の目標・顔・落ちる高さ
function karaAt(sh, t) {
  const S = sh.stage, o = { dy: 0, dx: 0, tx: 61, ty: 65, face: 'serious' };
  if (S === 0) {            // 手を押さえて悶える
    const e = smooth((t - 0.12) / 0.25);
    o.tx = lerp(61, KX + 9, e); o.ty = lerp(65, 105, e); o.face = 'pain';
    if (t > 0.3) { o.dx = Math.sin(t * 48) * 0.7; o.dy = -Math.abs(Math.sin((t - 0.3) * 13)) * 1.8; }
  } else {                  // 拳が瓦を割り下ろし、そのあと正拳の姿勢のまま真顔
    const wv = S === 1 ? [3, 15, 0.35, 0.6] : [8, 60, 0.6, 0.75];
    const w = smooth((t - 0.05) / wv[2]), e = smooth((t - wv[3]) / 0.3);
    o.tx = lerp(61 + wv[0] * w, KX + 27, e); o.ty = lerp(65 + wv[1] * w, 104, e);
  }
  if (S >= 3 && t > FALL_T) {   // 床が抜けて、本人だけ下の階へ
    const tt = t - FALL_T, fall = BY - GY, tl = Math.sqrt(2 * fall / GRAV);
    o.dy = tt < tl ? 0.5 * GRAV * tt * tt : fall - 3 * Math.exp(-(tt - tl) * 7) * Math.abs(Math.sin((tt - tl) * 16));
  }
  return o;
}

// ---- 破片 ----
// 着地までの時間（床に届かないなら Infinity）
function landT(p) {
  if (!isFinite(p.fy)) return Infinity;
  const d = p.vy * p.vy - 2 * GRAV * (p.y - p.fy);
  if (d < 0) return Infinity;
  return Math.max(0, (-p.vy + Math.sqrt(d)) / GRAV);
}
// 時刻 t の破片の姿勢を o に書く（位置 x,y・角度 a・透明度 al・大きさ s）。式だけで決まるので早送りでも飛ばない
function poseAt(p, t, o) {
  o.x = p.x; o.y = p.y; o.a = 0; o.al = 1; o.s = 1;
  if (t >= p.tb) {
    const tt = t - p.tb;
    if (p.kind === 'puff') {
      const u = clamp(tt / p.life, 0, 1);
      o.s = lerp(p.r0, p.r1, 1 - (1 - u) * (1 - u)); o.al = (1 - u) * 0.85; o.y = p.y + p.vy * tt;
    } else if (p.kind === 'tilt') {       // 倒れる（軸のまわりに回る）
      const u = clamp(tt / p.dur, 0, 1), ang = p.ang * (p.out ? 1 - (1 - u) * (1 - u) : u * u);
      const c = Math.cos(ang), s = Math.sin(ang), dx = p.x - p.px, dy = p.y - p.py;
      o.x = p.px + dx * c - dy * s; o.y = p.py + dx * s + dy * c; o.a = ang;
    } else if (tt < p.tl) {                // 飛ぶ
      o.x = p.x + p.vx * tt; o.y = p.y + p.vy * tt + 0.5 * GRAV * tt * tt; o.a = p.w * tt;
    } else {                               // 着地（少し滑って、平らに落ち着く）
      const u = tt - p.tl, ar = p.w * p.tl, flat = Math.round(ar / Math.PI) * Math.PI;
      o.x = p.x + p.vx * p.tl + p.vx * 0.06 * (1 - Math.exp(-8 * u)); o.y = p.fy; o.a = lerp(ar, flat, 1 - Math.exp(-12 * u));
      if (t >= p.drop) { const dd = t - p.drop; o.y = Math.min(p.fy2, p.fy + 0.5 * GRAV * dd * dd); }
    }
  } else if (p.hid) o.al = 0;
  if (t > p.fade) o.al *= 1 - clamp((t - p.fade) / 0.2, 0, 1);
  return o;
}

// 家の窓・ドアの飾り（箱の中心が原点。[x, y, w, h, 色] の長方形を順に描く）
function houseDec(w, h) {
  const d = [], win = (x, y, ww, hh) => {
    d.push([x - 0.7, y - 0.7, ww + 1.4, hh + 1.4, '#9a7048'], [x, y, ww, hh, '#d4f0ff'],
      [x + ww / 2 - 0.25, y, 0.5, hh, '#9a7048'], [x, y + hh / 2 - 0.25, ww, 0.5, '#9a7048']);
  };
  win(-w * 0.4, -h * 0.3, w * 0.24, h * 0.24);
  win(-w * 0.4, h * 0.06, w * 0.24, h * 0.22);
  d.push([w * 0.1, h / 2 - h * 0.42, w * 0.24, h * 0.42, '#b9824a'], [w * 0.1 + w * 0.17, h / 2 - h * 0.22, 1, 1, '#ffe27a']);
  win(w * 0.16, -h * 0.3, w * 0.2, h * 0.2);
  d.push([-w / 2, h / 2 - 1.6, w, 1.6, '#00000020']);
  return d;
}

// 段階 S までの見せ場を作る。S より上の物は壊れずに（tb = Infinity）そのまま置いてある
function buildShow(S, seed) {
  const R = mkRng(seed), RG = mkRng(CFG.seed + 99);   // R：飛び方（連打数で変わる） RG：形・切れ目（いつも同じ）
  const rr = (a, b) => a + (b - a) * R(), rg = (a, b) => a + (b - a) * RG();
  const sgn = () => (R() < 0.5 ? -1 : 1);
  const T = (st, t) => (S >= st ? t : Infinity);
  const P = [], cues = [], shakes = [], flashes = [];
  const cue = (t, s) => { if (isFinite(t)) cues.push({ t, s }); };
  const shake = (t, a, d) => { if (isFinite(t)) shakes.push({ t, a, d }); };
  const flash = (t, a) => { if (isFinite(t)) flashes.push({ t, a }); };

  function add(o) {
    const p = Object.assign({ g: '', idx: 0, x: 0, y: 0, poly: null, col: '#ccc', edge: null, lay: 3, kind: 'fly', tb: Infinity,
      vx: 0, vy: 0, w: 0, fy: Infinity, fy2: Infinity, drop: Infinity, fade: Infinity, hid: false, hh: 1, tl: Infinity,
      dec: null, decp: null, deco: null, ck: null, ckT: Infinity }, o);
    if (p.poly) { let m = 0; for (let i = 1; i < p.poly.length; i += 2) m = Math.max(m, Math.abs(p.poly[i])); p.hh = m; }
    P.push(p);
    return p;
  }
  const box = (w, h) => [-w / 2, -h / 2, w / 2, -h / 2, w / 2, h / 2, -w / 2, h / 2];
  const floorAt = (x, st) => (st <= 2 ? GY : st === 3 ? (x > HX0 && x < HX1 ? BY : GY) : (x > DL && x < DR ? BY : GY));
  // 着地する床を決める（飛んだ先の x で、抜けた床の下かどうか）
  function settle(p, st) {
    p.fy = GY - p.hh; let tl = landT(p);
    const f = floorAt(p.x + p.vx * (isFinite(tl) ? tl : 0), st);
    p.fy = f - p.hh; p.tl = landT(p);
    return p;
  }
  const puff = (x, y, r0, r1, tb, life, col) => add({ g: 'puff', kind: 'puff', x, y, r0, r1, tb, life, vy: -10, col, lay: 5, hid: true });

  // ---- 瓦（上から k 枚目。1 枚を 3 つに割る）。段階 1 は上の 5 枚、段階 2 で全部 ----
  for (let k = 0; k < CFG.tiles; k++) {
    const i = CFG.tiles - 1 - k, st = k < 5 ? 1 : 2, hy = TH / 2;
    const cy = TB - (i + 1) * TP + (TP - TH) + hy, x0 = TX - TW / 2;
    const xs = [x0, x0 + TW * rg(0.25, 0.4), x0 + TW * rg(0.6, 0.78), x0 + TW], sl = [0, rg(-0.9, 0.9), rg(-0.9, 0.9), 0];
    const tb = T(st, 0.05 + k * (S >= 2 ? 0.03 : 0.07));
    for (let j = 0; j < 3; j++) {
      const xa = xs[j], xb = xs[j + 1], cx = (xa + xb) / 2, side = j === 0 ? -1 : j === 2 ? 1 : sgn();
      const p = add({ g: 'tile', idx: k, x: cx, y: cy, poly: [xa - cx, -hy, xb - cx, -hy, xb + sl[j + 1] - cx, hy, xa + sl[j] - cx, hy],
        col: i % 2 ? '#7690ab' : '#6a84a0', edge: '#3b4a5c', deco: 'tile', tb, vx: side * rr(16, 48), vy: -rr(50, 130), w: side * rr(2, 9) });
      settle(p, 2);
      if (S >= 3) { const xl = p.x + p.vx * p.tl; if (xl > HX0 && xl < HX1) { p.drop = DROP_T; p.fy2 = BY - p.hh; } }   // 床が抜けたら一緒に落ちる
      const w = xb - xa;   // ひび（割れずに残る瓦）
      if (j === 1 && ((S === 0 && k < 8) || (S === 1 && k >= 5 && k < 9))) {
        p.ck = [-w * 0.3, -hy, -w * 0.05, -hy * 0.1, w * 0.15, hy * 0.2, 0, hy];
        p.ckT = S === 0 ? 0.05 + k * 0.02 : 0.1 + (k - 5) * 0.04;
      }
    }
    if (isFinite(tb) && k % 3 === 0) cue(tb, 'tile');
  }
  if (S >= 1) { shake(0.05, 5, 0.45); cue(0.02, 'crack'); }
  if (S >= 1) for (let n = 0; n < 3; n++) puff(TX + rr(-10, 10), TB - 20 + n * 12, 5, 16, 0.1 + n * 0.18, 0.5, '#ffffff');
  if (S === 0) { shake(0.02, 3, 0.3); cue(0.02, 'crack'); cue(0.3, 'thud'); }

  // ---- 瓦の台（段階 3）----
  for (const bx of [TX - TW / 2 - 0.5, TX + TW / 2 - 6.5]) {
    const p = add({ g: 'stand', x: bx + 3.5, y: (TB + GY) / 2, poly: box(7, GY - TB), col: '#b3a99a', edge: '#6e6658', deco: 'stone', tb: T(3, 0.97 + rr(0, 0.1)),
      vx: rr(-10, 10), vy: rr(-10, 10), w: rr(-1.5, 1.5) });
    p.fy = BY - p.hh; p.tl = landT(p);
  }
  // ---- 道場の床（段階 3 で瓦の下が抜ける。残りは段階 4 の崩壊で）----
  for (let x = DL; x < DR - 0.5;) {
    let w = rg(10, 16); if (DR - x - w < 6) w = DR - x;
    const cx = x + w / 2, hole = cx > HX0 && cx < HX1, st = hole ? 3 : 4;
    const p = add({ g: 'slab', x: cx, y: GY + 5, poly: box(w, 10), col: '#e0b068', edge: '#8a6a3a', deco: 'floor', tb: hole ? T(3, 0.95 + rr(0, 0.25)) : T(4, 1.75 + rr(0, 0.3)),
      vx: (cx - KX) * 0.3 + rr(-10, 10), vy: hole ? rr(-20, 30) : -rr(10, 60), w: rr(-2, 2) });
    p.fy = BY - p.hh; p.tl = landT(p);
    x += w;
  }
  if (S >= 3) { shake(0.95, 8, 0.6); flash(0.95, 0.18); cue(0.95, 'floor'); cue(0.98, 'rumble'); cue(FALL_T + Math.sqrt(2 * (BY - GY) / GRAV), 'thud'); shake(FALL_T + 0.46, 7, 0.4);
    for (let n = 0; n < 4; n++) puff(rg(0, 100) + (n - 1.5) * 8, GY + 2, 8, 26, 1.0 + n * 0.1, 0.7, '#f5ead0'); }

  // ---- 道場の建物（段階 4）：屋根が吹き飛び、壁が崩れる ----
  const dtb = () => T(4, 1.85 + rr(0, 0.3));
  const dojoFly = (p, vx, vy, w) => { p.vx = vx; p.vy = vy; p.w = w; settle(p, 4); return p; };
  for (let c = 0; c < 6; c++) for (let r = 0; r < 2; r++) {     // 奥の壁
    const cw = (DR - DL) / 6, cx = DL + cw * (c + 0.5), cy = 8 + 33 + 66 * r;
    const col = r === 0 ? ((c + r) % 2 ? '#fbf1d6' : '#f8edcf') : ((c + r) % 2 ? '#ebc98c' : '#e6c384');
    dojoFly(add({ g: 'dojo', idx: 0, x: cx, y: cy, poly: box(cw, 66), col, edge: col, lay: 2, tb: dtb(), deco: r === 1 ? 'planks' : ['window', 'plaque', 'scroll', 'shrine', 'window', 'window'][c] }),
      (cx - KX) * 0.45 + rr(-14, 14), -rr(30, 150), rr(-2, 2));
  }
  for (const x of [-60, -26, 8, 42, 76, 110, 144]) {            // 柱
    dojoFly(add({ g: 'dojo', x, y: 74, poly: box(3.2, 132), col: '#8a5a2e', edge: '#6e4521', lay: 2, tb: dtb() }),
      (x - KX) * 0.25 + rr(-10, 10), -rr(10, 60), rr(-4, 4));
  }
  for (let n = 0; n < 4; n++) {                                  // 長押（はり）
    const bw = (DR - DL) / 4, cx = DL + bw * (n + 0.5);
    dojoFly(add({ g: 'dojo', x: cx, y: 45.2, poly: box(bw, 2.4), col: '#6e4521', lay: 2, tb: dtb() }), (cx - KX) * 0.3 + rr(-10, 10), -rr(10, 70), rr(-2, 2));
  }
  for (const sd of [-1, 1]) for (let n = 0; n < 3; n++) {        // 外の壁
    const cx = sd < 0 ? DL - 2.5 : DR + 2.5;
    dojoFly(add({ g: 'dojo', x: cx, y: 8 + 22 + 44 * n, poly: box(5, 44), col: '#b98a52', edge: '#6e4521', lay: 4, tb: dtb() }),
      sd * rr(18, 38), -rr(20, 100), sd * rr(1, 4));
  }
  const rx = []; for (let n = 0; n <= 8; n++) rx.push(-92 + (182 + 92) * n / 8);
  const rtop = x => (x <= -30 ? lerp(12, -42, (x + 92) / 62) : x >= 120 ? lerp(-42, 12, (x - 120) / 62) : -42);
  for (let n = 0; n < 8; n++) {                                  // 屋根（吹き飛ぶ）
    const a = rx[n], b = rx[n + 1], cx = (a + b) / 2, ymin = Math.min(rtop(a), rtop(b)), cy = (ymin + 12) / 2;
    dojoFly(add({ g: 'dojo', x: cx, y: cy, poly: [a - cx, rtop(a) - cy, b - cx, rtop(b) - cy, b - cx, 12 - cy, a - cx, 12 - cy],
      col: n % 2 ? '#c0573f' : '#b5503c', edge: '#8a3a2a', lay: 4, tb: T(4, 1.65 + rr(0, 0.12)) }),
      (cx - 45) * 0.25 + rr(-14, 14), -rr(200, 260), rr(-4, 4) + (cx < 45 ? -1 : 1));
  }
  if (S >= 4) { shake(1.7, 12, 0.8); flash(1.7, 0.25); cue(1.65, 'whoosh'); cue(1.8, 'collapse'); cue(1.9, 'rumble');
    for (let n = 0; n < 4; n++) puff(-60 + n * 70, GY - 8, 14, 46, 1.9 + n * 0.06, 0.8, '#f5ead0'); }

  // ---- 町内（段階 5）：電柱と家が、近い順に外へ倒れる ----
  const HOUSES = [
    { x0: -120, x1: -82, h: 46, o: 2, c: '#ffd7a8', r: '#d9604c' }, { x0: -178, x1: -138, h: 58, o: 6, c: '#cfe8ff', r: '#4c7fd9' },
    { x0: -245, x1: -198, h: 42, o: 8, c: '#ffe0e6', r: '#7a5cc0' }, { x0: 172, x1: 210, h: 50, o: 3, c: '#d9f2c4', r: '#d9904c' },
    { x0: 228, x1: 268, h: 42, o: 7, c: '#fff2a8', r: '#4cb0d9' }, { x0: 288, x1: 335, h: 56, o: 9, c: '#e6d4ff', r: '#d95c8a' }];
  const POLES = [{ x: -130, o: 0 }, { x: 220, o: 1 }, { x: -190, o: 4 }, { x: 280, o: 5 }];
  const toppleT = o => T(5, 2.25 + o * 0.055);
  for (const h of HOUSES) {
    const sd = h.x1 < 45 ? -1 : 1, w = h.x1 - h.x0, mid = (h.x0 + h.x1) / 2, tb = toppleT(h.o);
    const tilt = { kind: 'tilt', tb, px: sd < 0 ? h.x0 : h.x1, py: GY, ang: sd * 1.55, dur: 0.42, lay: 1 };
    add(Object.assign({ g: 'house', x: mid, y: GY - h.h / 2, poly: box(w, h.h), col: h.c, edge: '#b49470',
      dec: houseDec(w, h.h) }, tilt));
    add(Object.assign({ g: 'house', x: mid, y: GY - h.h - 6, poly: [-w / 2 - 4, 6, 0, -8, w / 2 + 4, 6], col: h.r, edge: '#8a3a2a',
      dec: [[w * 0.16, -6.5, 3.6, 6, '#a8584a'], [-w * 0.5, 4.2, w + 0, 1.6, '#00000018']] }, tilt));
    puff(tilt.px + sd * 22, GY - 6, 5, 22, isFinite(tb) ? tb + 0.38 : Infinity, 0.6, '#f5ead0');
    if (isFinite(tb)) { cue(tb + 0.4, 'topple'); shake(tb + 0.4, 5, 0.25); }
  }
  for (const pl of POLES) {
    const sd = pl.x < 45 ? -1 : 1, tb = toppleT(pl.o);
    add({ g: 'pole', kind: 'tilt', x: pl.x, y: GY - 36, poly: [-1.3, 36, -1.3, -30, -8, -30, -8, -33, 8, -33, 8, -30, 1.3, -30, 1.3, 36],
      col: '#7a5a3a', edge: '#4a3a24', lay: 1, tb, px: pl.x, py: GY, ang: sd * 1.5, dur: 0.5 });
  }
  if (S >= 5) { shake(2.3, 4, 0.9); cue(2.25, 'rumble'); }

  // ---- 裏山（段階 6）：真っ二つ ----
  const half = (pts, pvx, ang, col, cap, trees) => {
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (let i = 0; i < pts.length; i += 2) { x0 = Math.min(x0, pts[i]); x1 = Math.max(x1, pts[i]); y0 = Math.min(y0, pts[i + 1]); y1 = Math.max(y1, pts[i + 1]); }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, poly = [];
    for (let i = 0; i < pts.length; i += 2) poly.push(pts[i] - cx, pts[i + 1] - cy);
    const decp = [];
    const rel = a => { const q = []; for (let i = 0; i < a.length; i += 2) q.push(a[i] - cx, a[i + 1] - cy); return q; };
    decp.push({ col: '#f4fbff', pts: rel(cap) });
    for (const [tx, ty, ts] of trees) decp.push({ col: '#5fae85', pts: rel([tx - ts, ty, tx, ty - ts * 2.2, tx + ts, ty]) });
    add({ g: 'mountain', kind: 'tilt', x: cx, y: cy, poly, col, edge: '#6fa08a', lay: 0, tb: T(6, 2.8), px: pvx, py: GY, ang, dur: 0.55, out: true, decp });
  };
  half(MT_L, -260, -0.17, '#8dc3a6', [45, -210, 10, -185, 17, -178, 25, -183, 32, -172, 40, -178, 45, -164],
    [[-200, 125, 8], [-170, 130, 9], [-130, 118, 8], [-95, 128, 9], [-60, 120, 8], [-20, 130, 9], [20, 122, 8]]);
  half(MT_R, 350, 0.17, '#9ccfb0', [45, -210, 80, -170, 72, -163, 63, -170, 56, -160, 50, -166, 45, -158],
    [[70, 128, 9], [105, 120, 8], [140, 130, 9], [180, 118, 8], [220, 128, 9], [270, 122, 8], [310, 130, 9]]);
  for (let n = 0; n < 8; n++) {                                  // 割れ目から飛ぶ岩
    const s = rg(7, 15), sx = sgn();
    const p = add({ g: 'rock', x: 45 + rg(-25, 25), y: rg(-190, -120), poly: [-s, s * 0.6, 0, -s, s, s * 0.6], col: n % 2 ? '#8a9a8a' : '#9aaa9a', edge: '#6a7a6a', lay: 0, tb: T(6, 2.85 + rr(0, 0.2)),
      vx: sx * rr(20, 80), vy: -rr(60, 200), w: sx * rr(2, 8) });
    settle(p, 2);
  }
  for (let n = 0; n < 4; n++) puff(45 + (n - 1.5) * 40, GY - 20, 20, 60 + n * 6, T(6, 2.85 + n * 0.05), 0.9, '#e8f0e8');
  if (S >= 6) { shake(2.8, 14, 0.9); flash(2.8, 0.25); cue(2.8, 'mountain'); cue(3.0, 'crash'); }

  // ---- 地面（段階 7）：大きなクレーター。足場だけが細い柱で残る ----
  const t7 = CFG.craterT[0];
  for (let n = 0; n < 100; n++) {
    const s = rg(5, 14), tri = rg(0, 1) < 0.5, poly = tri ? [-s, s * 0.6, 0, -s, s, s * 0.6] : box(s, s * 0.8);
    const y0 = GY + rg(10, 200), x0 = CR.x + rg(-0.9, 0.9) * CR.R;
    const p = add({ g: 'dirt', x: x0, y: y0, poly, col: STRATA[1 + Math.floor(rg(0, STRATA.length - 1))][1], edge: null, lay: 5, hid: true, tb: T(7, t7 + rr(0, 0.15)), w: sgn() * rr(2, 10) });
    p.fy = GY - p.hh;
    const hA = rr(60, 260);
    p.vy = -Math.sqrt(2 * GRAV * (y0 - p.fy + hA));
    p.tl = landT(p);
    p.vx = (CR.x + sgn() * (CR.R + rr(15, 260)) - x0) / p.tl;   // 穴の外の地面に降る
  }
  for (let n = 0; n < 10; n++) puff(CR.x + (n - 4.5) * 40, GY - 4, 25, 70, T(7, t7 + n * 0.03), 1.0, '#ead9bc');
  if (S >= 7) { shake(t7, 22, 1.1); flash(t7, 0.75); cue(t7, 'crater'); cue(t7 + 0.05, 'rumble'); }
  // クレーターの中に落ちた物は、掘られる時に消える（足場の柱の上の物は残る）
  if (S >= 7) for (const p of P) {
    if (p.g === 'dirt' || p.g === 'puff' || p.g === 'mountain' || p.g === 'rock' || !isFinite(p.tb)) continue;
    const xr = p.kind === 'tilt' ? p.px : p.x + p.vx * (isFinite(p.tl) ? p.tl : 0), u = Math.abs(xr - CR.x) / CR.R;
    if (u < 0.96 && !(xr > PX - PW / 2 - 4 && xr < PX + PW / 2 + 4)) p.fade = t7 + 0.1 + (1 - u) * 0.3;
  }

  // ---- 反応の音（門下生・住人）----
  if (S === 0) cue(0.6, 'wah');
  if (S === 1) { cue(0.45, 'clap'); cue(0.9, 'clap'); }
  if (S === 2) cue(0.7, 'crowd');
  if (S >= 3) { cue(0.45, 'crowd'); cue(FLEE_T, 'run'); }
  if (S >= 4) cue(1.8, 'crowd');
  if (S >= 5) cue(2.7, 'crowd');
  if (S >= 7) cue(3.5, 'gong');

  // ---- 大きな文字・音の合図 ----
  const caps = [];
  const k0 = S >= 2 ? 2 : S;
  for (let k = k0; k <= S; k++) caps.push({ t: CFG.showCaps[k][1], text: CFG.showCaps[k][0] });
  cues.sort((a, b) => a.t - b.t);
  return { stage: S, seed, dur: CFG.showSecs[S], pieces: P, cues, shakes, flashes, caps, bubbles: bubblesFor(S) };
}
