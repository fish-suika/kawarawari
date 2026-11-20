// ===== 自動テスト =====
(function () {
  const out = document.getElementById('out');
  let fail = 0, total = 0;
  function check(name, cond, note) {
    total++;
    if (!cond) fail++;
    const p = document.createElement('div');
    p.className = cond ? 'ok' : 'ng';
    p.textContent = (cond ? 'OK  ' : 'NG  ') + name + (note ? '  [' + note + ']' : '');
    out.appendChild(p);
  }
  function note(text) {
    const p = document.createElement('div');
    p.textContent = text;
    out.appendChild(p);
  }
  function advance(sec) { for (let i = 0; i < Math.round(sec / CFG.h); i++) Game.step(CFG.h); }

  // 「はじめ」を終えて連打が始まった直後の状態を作る
  function startPlay() {
    Game.reset(); Game.begin();
    let n = 0;
    while (Game.mode !== 'play' && n++ < 1000) Game.step(CFG.h);
    Game.events.length = 0;
  }

  // ボット：毎秒 rate 回、最初の連打は半周期ずらして押す。終了（結果）まで進めて結果を返す
  function bot(rate) {
    startPlay();
    let next = 0.5 / rate, n = 0;
    while (Game.mode !== 'over' && n++ < 120 * 20) {
      while (Game.mode === 'play' && Game.t >= next) { Game.tap(); next += 1 / rate; }
      Game.step(CFG.h);
    }
    return { count: Game.count, stage: Game.stage() };
  }

  // --- 段階のしきい値 ---
  // しきい値は CFG.levelAt から導く（0、各しきい値の 1 つ手前とちょうど、最高の少し上と大きな値）
  const LV = CFG.levelAt, TOP = LV[LV.length - 1];
  const cases = [[0, 0]];
  LV.forEach((v, i) => { cases.push([v - 1, i], [v, i + 1]); });
  const NS = CFG.stageNames.length, LAST = NS - 1, ALLS = Array.from({ length: NS }, (_, i) => i);
  cases.push([TOP + 1, LAST], [TOP * 3, LAST]);
  const bad = cases.filter(([n, s]) => stageFor(n) !== s).map(([n, s]) => n + '→' + stageFor(n) + '(want ' + s + ')');
  check('連打数ごとの段階（' + (LV[0] - 1) + '→0, ' + LV[0] + '→1, …, ' + (TOP - 1) + '→' + (LAST - 1) + ', ' + TOP + '→' + LAST + '）', bad.length === 0, bad.join(' ') || cases.map(([n]) => n + '→' + stageFor(n)).join(' '));
  check('段階は 0〜10 の 11 段階（しきい値 10 個・6 回ごと・昇順）。毎秒 12 回 × 5 秒 = 60 回が最上段', LV.length === 10 && NS === 11 && LV.every((v, i) => v === 6 * (i + 1)) && TOP === 12 * CFG.duration);
  check('オーラの段は段階と同じ区切り（' + CFG.tierEvery + ' 回ごと）で 1 つ上がる', CFG.tierEvery === LV[0] && LV.every((v, i) => tierFor(v - 1) === i && tierFor(v) === i + 1) && tierFor(TOP * 3) === CFG.maxTier && CFG.maxTier === 10);

  // --- 流れ ---
  Game.reset();
  check('最初はタイトル（連打は受け付けない）', Game.mode === 'title' && Game.tap() === 'ignored' && Game.count === 0);
  Game.begin();
  check('タップで「はじめ」へ', Game.mode === 'ready');
  check('「はじめ」の間の連打は数えない', Game.tap() === 'ignored' && Game.count === 0);
  advance(CFG.readySecs - 0.05);
  check('「はじめ」は約 0.6 秒', Game.mode === 'ready');
  advance(0.1);
  check('「はじめ」のあとに連打が始まる', Game.mode === 'play' && Game.t < 0.1, 't=' + Game.t.toFixed(3));

  // --- 5 秒の締め切り ---
  startPlay();
  advance(3);                       // 3 秒たってから最初のタップ（最初のタップで始まるのではなく、固定の 5 秒）
  Game.tap();
  check('最初のタップが遅くても残り時間は固定（3 秒たって残り 2 秒）', Math.abs(Game.remaining() - 2) < 0.02, 'remaining=' + Game.remaining().toFixed(3));
  advance(1.9);
  check('締め切り直前のタップは数える', Game.mode === 'play' && Game.tap() === 'hit' && Game.count === 2, 'count=' + Game.count);
  advance(0.2);
  check('5 秒たつと連打が終わる（せいっ）', Game.mode === 'finish' || Game.mode === 'show' || Game.mode === 'over', Game.mode);
  const c0 = Game.count;
  const r = Game.tap();
  check('締め切り後の入力は数えない', r === 'ignored' && Game.count === c0, 'count=' + Game.count);
  advance(CFG.finishSecs + 0.05);
  check('「せいっ」のあと破壊の見せ場へ', Game.mode === 'show' || Game.mode === 'over', Game.mode);
  advance(CFG.showSecs[Game.stage()] + 0.1);
  check('見せ場のあと結果へ', Game.mode === 'over');
  Game.tap();
  check('結果画面でも数えない', Game.count === c0);

  // 5 秒ちょうどの境目
  startPlay();
  advance(4.99);
  const near = Game.tap();
  advance(0.02);
  const after = Game.tap();
  check('4.99 秒は数え、5.01 秒は数えない', near === 'hit' && after === 'ignored' && Game.count === 1);

  // --- 結果直後の誤タップ防止 ---
  startPlay(); advance(CFG.duration + CFG.finishSecs + CFG.showSecs[0] + 0.05);
  check('結果の直後は再挑戦を受け付けない', Game.mode === 'over' && !Game.canRetry());
  advance(CFG.retryWait);
  check('約 0.5 秒たつと再挑戦できる', Game.canRetry());

  // --- 1 秒 25 回の上限（直近 1 秒の窓）---
  startPlay();
  let accepted = 0;
  for (let i = 0; i < 100; i++) if (Game.tap() === 'hit') accepted++;
  check('同じ瞬間に 100 回押しても 25 回まで', accepted === CFG.maxPerSec && Game.count === 25, 'count=' + Game.count);
  advance(1.01);
  check('1 秒あけるとまた数えられる', Game.tap() === 'hit');

  startPlay();
  const times = [];
  let next = 0, hits = 0;
  while (Game.mode === 'play') {   // 毎秒 50 回（人間には出せない速さ）で 5 秒
    while (Game.t >= next) { if (Game.tap() === 'hit') times.push(Game.t); next += 1 / 50; if (Game.mode !== 'play') break; }
    Game.step(CFG.h);
  }
  let worst = 0;
  for (let i = 0; i < times.length; i++) { let n = 0; for (let j = i; j < times.length && times[j] - times[i] < 1 - 1e-9; j++) n++; worst = Math.max(worst, n); }
  check('毎秒 50 回で 5 秒押しても、どの 1 秒の窓も 25 回以下', worst <= CFG.maxPerSec && times.length >= 120 && times.length <= 126, '最大窓=' + worst + ' 合計=' + times.length);

  // 毎秒 25 回は全部数える（上限ちょうどは落とさない）
  const b25 = bot(25);
  check('毎秒 25 回ぴったりは落とさず数える', b25.count >= 124 && b25.count <= 125, 'count=' + b25.count);

  // --- キーの押しっぱなし ---
  check('スペース・Enter は受け付ける', acceptKey({ key: ' ', repeat: false }) && acceptKey({ key: 'Enter', repeat: false }));
  check('押しっぱなし（repeat）は数えない', !acceptKey({ key: ' ', repeat: true }) && !acceptKey({ key: 'Enter', repeat: true }));
  check('他のキーは数えない', !acceptKey({ key: 'a', repeat: false }) && !acceptKey({ key: 'ArrowLeft', repeat: false }));
  startPlay();
  let held = 0;
  for (let i = 0; i < 50; i++) { const e = { key: ' ', repeat: i > 0 }; if (acceptKey(e) && Game.tap() === 'hit') held++; advance(0.03); }
  check('スペースを 1.5 秒押しっぱなしにしても 1 回だけ', held === 1 && Game.count === 1, 'count=' + Game.count);

  // --- ボットが届く段階 ---
  note('--- 一定の速さのボット（5 秒）---');
  // 毎秒 4→20 回→段階 3、6→30 回→段階 5、8→40 回→段階 6、10→50 回→段階 8、12→60 回→段階 10（CFG.levelAt から導く）
  const RATES = [4, 6, 8, 10, 12];
  const want = { 4: stageFor(20), 6: stageFor(30), 8: stageFor(40), 10: stageFor(50), 12: stageFor(60) };
  const botRes = {};
  for (const rate of RATES) {
    const b = bot(rate); botRes[rate] = b;
    check('毎秒 ' + rate + ' 回 × 5 秒 → ' + b.count + ' 回 → 段階 ' + b.stage + '（' + CFG.stageNames[b.stage] + '）', b.stage === want[rate], '想定 段階' + want[rate]);
  }
  check('毎秒 12 回（両手の全力）× 5 秒 = 60 回 → 最上段（段階 10）、毎秒 10 回は段階 8', botRes[12].count === 60 && botRes[12].stage === LAST && botRes[10].stage === 8, 'count=' + botRes[12].count);
  note('ボット一覧：' + RATES.map(r => '毎秒' + r + '回=' + botRes[r].count + '回/段階' + botRes[r].stage).join('、'));

  // ===== Phase 2：破壊の見せ場 =====
  note('--- Phase 2：破壊の見せ場 ---');
  // 連打数 n で締め切りまで進め、「せいっ」→見せ場→結果の長さを測る
  function runShow(n) {
    startPlay(); Game.count = n;
    advance(CFG.duration + 0.01);
    let sh = 0, guard = 0;
    while (Game.mode === 'finish' && guard++ < 5000) Game.step(CFG.h);
    const stage = Game.stage(); guard = 0;
    while (Game.mode === 'show' && guard++ < 5000) { Game.step(CFG.h); sh += CFG.h; }
    return { stage, sh, mode: Game.mode };
  }
  const counts = [0].concat(CFG.levelAt), lens = [];   // 各段階になる最低の連打数
  for (let st = 0; st < NS; st++) {
    const r = runShow(counts[st]); lens.push(r.sh);
    check('段階 ' + st + ' の見せ場は ' + r.sh.toFixed(2) + ' 秒で結果へ（上限 ' + CFG.showMax + ' 秒）', r.stage === st && r.mode === 'over' && r.sh <= CFG.showMax + 0.02 && Math.abs(r.sh - CFG.showSecs[st]) < 0.02, 'stage=' + r.stage + ' mode=' + r.mode);
  }
  let mono = true; for (let i = 1; i < NS; i++) if (!(lens[i] > lens[i - 1])) mono = false;
  check('見せ場は段階が高いほど長い（単調増加）', mono, lens.map(v => v.toFixed(2)).join(' < '));
  check('段階 0〜1 はすぐ結果へ（1.5 秒以内）、段階 7 までは今のまま（1.0〜4.0 秒）、段階 8〜10 は 4.5・4.8・5.0 秒で最長約 5 秒', lens[0] <= 1.5 && lens[1] <= 1.5 && [1.0, 1.2, 1.5, 2.1, 2.7, 3.2, 3.6, 4.0].every((v, i) => Math.abs(lens[i] - v) < 0.02) && lens[8] <= 4.52 && lens[9] <= 4.82 && lens[10] <= 5.02 && CFG.showMax === 5.0, lens.map(v => v.toFixed(2)).join(' '));

  // 早送り
  startPlay(); Game.count = TOP; advance(CFG.duration + 0.01);
  while (Game.mode === 'finish') Game.step(CFG.h);
  advance(CFG.skipGrace * 0.5);
  check('見せ場の最初のうち（連打の指が残る間）は早送りにしない', Game.mode === 'show' && Game.skip() === false && Game.mode === 'show');
  advance(CFG.skipGrace);
  const tBefore = Game.showT, durBefore = Game.show.dur;
  const sk = Game.skip();
  check('早送り入力で直ちに結果へ移る（見せ場の途中から）', sk === true && Game.mode === 'over' && Game.overT === 0 && tBefore < durBefore, 'showT=' + tBefore.toFixed(2));
  advance(CFG.retryWait + 0.01);
  check('早送りのあと 0.5 秒で再挑戦でき、連打数・段階は変わらない', Game.canRetry() && Game.count === TOP && Game.stage() === LAST);
  check('見せ場でない間の早送りは何もしない', Game.skip() === false);

  // 破片の数・再現性
  let maxPieces = 0, maxBroken = 0;
  for (let st = 0; st < NS; st++) {
    const s = buildShow(st, CFG.seed + counts[st]);
    maxPieces = Math.max(maxPieces, s.pieces.length);
    maxBroken = Math.max(maxBroken, s.pieces.filter(p => isFinite(p.tb)).length);
  }
  check('破片の数が上限（' + CFG.maxPieces + '）を超えない（全段階）', maxPieces <= CFG.maxPieces, '最大 ' + maxPieces + '（うち飛ぶもの ' + maxBroken + '）');
  const sig = s => JSON.stringify(s.pieces.map(p => [p.x, p.y, p.vx, p.vy, p.w, p.tb, p.fy]));
  check('同じシードなら同じ壊れ方（再現できる）', sig(buildShow(7, 12345)) === sig(buildShow(7, 12345)));
  check('シードが違えば飛び方が変わる', sig(buildShow(7, 12345)) !== sig(buildShow(7, 54321)));
  let badN = 0;
  for (let st = 0; st < NS; st++) {
    const s = buildShow(st, 99);
    for (const t of [0, 0.5, 1, 2, 3, 4, 6]) for (const p of s.pieces) { const o = poseAt(p, t, { x: 0, y: 0, a: 0, al: 1, s: 1 }); if (![o.x, o.y, o.a, o.al, o.s].every(Number.isFinite)) badN++; }
  }
  check('どの時刻でも破片の位置が正常な数値（早送り・結果のあとも）', badN === 0, 'bad=' + badN);

  // 段階ごとに壊れる範囲がはっきり違う
  const groups = st => { const s = buildShow(st, 7), g = {}; for (const p of s.pieces) if (isFinite(p.tb) && p.g !== 'puff') g[p.g] = (g[p.g] || 0) + 1; return g; };
  const G = ALLS.map(groups), keys = g => Object.keys(g).sort().join(','), sum = g => Object.values(g).reduce((a, b) => a + b, 0);
  check('段階 0：何も割れない（ひびだけ）', Object.keys(G[0]).length === 0);
  check('段階 1：瓦が数枚だけ（5 枚 = 15 片）、段階 2：瓦が全部（20 枚 = 60 片）', G[1].tile === 15 && keys(G[1]) === 'tile' && G[2].tile === 60 && keys(G[2]) === 'tile', keys(G[1]) + ' / ' + keys(G[2]));
  check('段階 3：台と床が加わる', G[3].stand === 2 && G[3].slab > 0 && !G[3].dojo, keys(G[3]));
  check('段階 4：道場の建物が加わる', G[4].dojo > 20 && !G[4].house, keys(G[4]));
  check('段階 5：家と電柱が加わる（家 6 軒・電柱 4 本）', G[5].house === 12 && G[5].pole === 4 && !G[5].mountain, keys(G[5]));
  check('段階 6：裏山が割れる', G[6].mountain === 2 && G[6].rock > 0 && !G[6].dirt, keys(G[6]));
  check('段階 7：地面（クレーター）が加わる', G[7].dirt > 50, keys(G[7]));
  check('壊れる破片の数が段階ごとに増える（段階 1〜7）。段階 8〜10 は破片を足さず、大陸・地球を絵と動きで見せる', [1, 2, 3, 4, 5, 6, 7].every(i => sum(G[i]) > sum(G[i - 1])) && [8, 9, 10].every(i => sum(G[i]) === sum(G[7])), G.map(sum).join(' < '));
  const area = i => CAMS[i].w * CAMS[i].h;
  check('カメラが段階ごとに一段引く（範囲が必ず広がる。段階 10 は段階 9 の宇宙のまま）', [3, 4, 5, 6, 7, 8, 9].every(i => area(i) > area(i - 1)) && area(10) >= area(9));
  const cams = ALLS.map(st => camAt(st, showDur(st)));
  check('見せ場の終わりのカメラが段階の設定どおり', cams.every((c, i) => Math.abs(c.w - CAMS[i].w) < 0.01 && Math.abs(c.cy - CAMS[i].cy) < 0.01));
  const midc = camAt(7, CFG.camAt[7] + CFG.camDur[7] / 2);
  check('カメラは連続して動く（引いている途中は前後の中間）', midc.w > CAMS[6].w && midc.w < CAMS[7].w);

  // 画面の縦横比ごとに、引いたカメラが必要な範囲を覆う（はみ出さない）
  const asp = [[390, 844], [375, 667], [360, 800], [768, 1024], [844, 390], [1024, 768], [1280, 720], [1920, 1080], [2560, 1080], [600, 1200], [1950, 1135]];
  const off = [];
  for (const [w, h] of asp) for (let st = 0; st < NS; st++) {
    const v = viewFor(CAMS[st], w, h), e = EXTENT[st];
    if (!(v.x0 <= e.x0 && v.x1 >= e.x1 && v.y0 <= e.y0 && v.y1 >= e.y1)) off.push(w + 'x' + h + ' 段階' + st);
  }
  check('縦・横・PC の ' + asp.length + ' 種類の画面で、どの段階も必要な範囲が画面に入る（段階 8 は地平線と割れ目、段階 9〜10 は地球と月・星）', off.length === 0, off.join(', ') || asp.length + ' 種類 × ' + NS + ' 段階');
  check('クレーター：足場の柱はなく、本人の立つ中心は穴のいちばん深い平らな底（深さ ' + CR.D + '）。まわりは外へ浅くなり、穴の外は元の地面、掘る前は平ら',
    craterTop(PX, 1) === FLOOR_Y && FLOOR_Y === GY + CR.D && [-CFL, -30, 0, 30, CFL].every(d => craterTop(PX + d, 1) === FLOOR_Y) && craterTop(KX - 14, 1) === FLOOR_Y && craterTop(KX + 14, 1) === FLOOR_Y &&
    craterTop(CR.x + 150, 1) < FLOOR_Y && craterTop(CR.x + 150, 1) > GY + 20 && craterTop(CR.x + CR.R + 20, 1) === GY && craterTop(CR.x - CR.R - 20, 1) === GY && craterTop(CR.x + 100, 0) === GY &&
    Array.from({ length: 60 }, (_, i) => craterTop(PX + i * 4, 1)).every((y, i, a) => i === 0 || y <= a[i - 1] + 1e-9));
  check('大きな文字は段階ごとに用意（段階 7 は 6 つ：瓦、全部〜クレーター）', buildShow(7, 1).caps.length === 6 && buildShow(0, 1).caps.length === 1 && buildShow(1, 1).caps.length === 1 && buildShow(8, 1).caps.length === 7 && buildShow(9, 1).caps.length === 8 && buildShow(10, 1).caps.length === 9 && buildShow(10, 1).caps.slice(-3).map(c => c.text).join('|') === '大陸、真っ二つ|地球に、ひび|地球、真っ二つ');

  // --- 連打の反応（イベント）---
  startPlay();
  for (let i = 0; i < 20; i++) { Game.tap(); advance(0.05); }
  const ev = Game.events.filter(e => e.type === 'hit');
  check('数えた連打ごとに必ず反応のイベントが出る', ev.length === 20 && Game.count === 20, 'events=' + ev.length);
  const tierUps = [CFG.tierEvery, CFG.tierEvery * 2, CFG.tierEvery * 3].filter(n => n <= 20);
  check(CFG.tierEvery + ' 回ごとに「一段派手」のイベントが出る', ev.filter(e => e.tierUp).map(e => e.count).join(',') === tierUps.join(','));

  // ===== Phase 3：段位認定証・記録・共有・人の反応 =====
  note('--- Phase 3：段位認定証・記録・共有・反応 ---');
  // 段位の割り当て（0〜7）
  const wantRanks = ['出直し', '初段', '二段', '三段', '四段', '五段', '名誉師範', '破門', '永久破門', '地球出禁', '宇宙破門'];
  check('段位は段階 0〜10 に 1 つずつ（出直し→初段→…→名誉師範→破門→永久破門→地球出禁→宇宙破門）', RANKS.length === NS && wantRanks.every((r, i) => rankFor(i) === r) && new Set(RANKS).size === NS, RANKS.join('→'));
  check('段階 7 以上は「破門状」、それ以外は「段位認定証」', [7, 8, 9, 10].every(i => certTitle(i) === '破門状') && [0, 1, 2, 3, 4, 5, 6].every(i => certTitle(i) === '段位認定証'));
  check('連打数から結果の段位まで通る（20→三段、42→破門、48→永久破門、54→地球出禁、60→宇宙破門）', RANKS[stageFor(20)] === '三段' && RANKS[stageFor(42)] === '破門' && RANKS[stageFor(48)] === '永久破門' && RANKS[stageFor(54)] === '地球出禁' && RANKS[stageFor(60)] === '宇宙破門' && RANKS[stageFor(0)] === '出直し');
  check('届いた段階の名前は 11 個全部ちがう（空白なしの文章用も）', new Set(CFG.stageNames).size === NS && new Set(CFG.stageNames.map((_, i) => stageLabel(i))).size === NS && !stageLabel(6).includes(' '), stageLabel(6));
  check('認定文（師範のひとこと）が 11 あり、文節に区切ってある', VERDICTS.length === NS && VERDICTS[8].join('').includes('永久') && VERDICTS[9].join('').includes('禁') && VERDICTS[10].join('').includes('宇宙') && VERDICTS.every(v => v.length >= 2 && v.every(p => p.length > 0)) && VERDICTS[7].join('').includes('破門'));

  // 瓦の枚数表示
  check('瓦の枚数：段階 0 は 0 枚、段階 1 は 5 枚、段階 2 以上は「20 枚（と、その他）」',
    tileText(0) === '0 枚' && tileText(1) === '5 枚' && [2, 3, 4, 5, 6, 7, 8, 9, 10].every(i => tileText(i) === '20 枚（と、その他）'), [0, 1, 2, 10].map(tileText).join(' / '));
  const brokenTiles = st => buildShow(st, 5).pieces.filter(p => p.g === 'tile' && isFinite(p.tb)).length / 3;
  check('表示する瓦の枚数が、見せ場で実際に割れる枚数と同じ（0 / 5 / 20 枚）', brokenTiles(0) === tilesBroken(0) && brokenTiles(1) === tilesBroken(1) && brokenTiles(2) === tilesBroken(2) && tilesBroken(2) === CFG.tiles, [0, 1, 2].map(brokenTiles).join('/'));

  // 見た段階の記録
  check('見た段階：段階 0・1 はその段階だけ、段階 2 以上は 2〜届いた段階まで',
    JSON.stringify(seenFor(0)) === '[0]' && JSON.stringify(seenFor(1)) === '[1]' && JSON.stringify(seenFor(2)) === '[2]' && JSON.stringify(seenFor(5)) === '[2,3,4,5]' && JSON.stringify(seenFor(7)) === '[2,3,4,5,6,7]' && JSON.stringify(seenFor(10)) === '[2,3,4,5,6,7,8,9,10]');
  let rec = emptyRec(), r1 = applyResult(rec, 5, 30);
  check('初めての挑戦：見た段階と自己ベストが入る（「更新」は出さない）', r1.first && !r1.newStage && !r1.newCount && JSON.stringify(r1.rec.seen) === '[0,0,1,1,1,1,0,0,0,0,0]' && r1.rec.bestStage === 5 && r1.rec.bestCount === 30 && r1.rec.plays === 1, JSON.stringify(r1.rec));
  check('元の記録は書き換えない（純粋な関数）', JSON.stringify(rec) === JSON.stringify(emptyRec()));
  rec = r1.rec; const r2 = applyResult(rec, 3, 31);
  check('2 回目：連打数だけ更新（最高段階は 5 のまま）・新しく見た段階はなし', !r2.first && r2.newCount && !r2.newStage && r2.rec.bestStage === 5 && r2.rec.bestCount === 31 && r2.newSeen.length === 0, JSON.stringify(r2));
  rec = r2.rec; const r3 = applyResult(rec, 7, 45);
  check('3 回目：最高段階と連打数が更新され、段階 6・7 を新しく見る', r3.newStage && r3.newCount && r3.rec.bestStage === 7 && r3.rec.bestCount === 45 && JSON.stringify(r3.newSeen) === '[6,7]', JSON.stringify(r3.newSeen));
  rec = r3.rec; const r4 = applyResult(rec, 0, 2);
  check('悪い結果では自己ベストを下げない（段階 0 は新しく見る）', r4.rec.bestStage === 7 && r4.rec.bestCount === 45 && !r4.newStage && !r4.newCount && JSON.stringify(r4.newSeen) === '[0]' && seenCount(r4.rec) === 7 && r4.rec.plays === 4);
  // 見ていない段階は「？？？」（画面は 60-ui.js。ここでは見たかどうかを判定する）
  check('見ていない段階が分かる（段階 1 はまだ）', r4.rec.seen[1] === 0 && r4.rec.seen[0] === 1 && r4.rec.seen[7] === 1);

  // 保存：使えなくても例外を出さない
  const mem = {}; const fake = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); } };
  check('保存して読み戻せる', saveRec(r4.rec, fake) === true && JSON.stringify(loadRec(fake)) === JSON.stringify(r4.rec));
  const badStore = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('quota'); } };
  let thrown = false, got1, got2, got3, got4;
  try { got1 = loadRec(badStore); got2 = saveRec(r4.rec, badStore); got3 = loadRec(null); got4 = saveRec(r4.rec, null); } catch (_) { thrown = true; }
  check('保存が使えない（読み書きで例外・null）ときも例外を出さず、空の記録で動く', !thrown && JSON.stringify(got1) === JSON.stringify(emptyRec()) && got2 === false && JSON.stringify(got3) === JSON.stringify(emptyRec()) && got4 === false);
  const junk = ['{', 'null', '123', '"x"', '[]', '{"seen":"a","bestStage":99,"bestCount":-5,"plays":"x"}'];
  let junkOk = true;
  for (const j of junk) { try { const rr0 = loadRec({ getItem: () => j }); if (!(rr0.seen.length === NS && rr0.bestStage >= -1 && rr0.bestStage <= LAST && rr0.bestCount >= 0 && rr0.plays >= 0)) junkOk = false; } catch (_) { junkOk = false; } }
  check('壊れた保存データ（6 種類）でも安全な記録になる', junkOk);
  // 古い保存データ（8 段階分）が残っていても壊れず、続きから遊べる
  const old8 = '{"seen":[0,0,1,1,1,1,1,1],"bestStage":7,"bestCount":45,"plays":4}', ro = loadRec({ getItem: () => old8 });
  check('古い保存データ（8 段階分）を読める：見た段階 8 つはそのまま、新しい 3 段階は未見、自己ベストも残る', ro.seen.length === NS && JSON.stringify(ro.seen) === '[0,0,1,1,1,1,1,1,0,0,0]' && ro.bestStage === 7 && ro.bestCount === 45 && ro.plays === 4, JSON.stringify(ro.seen));
  const roN = applyResult(ro, 10, 60);
  check('古いデータのまま段階 10 に届くと、段階 8・9・10 を新しく見る・最高段階が 10 になる（更新の表示つき）', roN.newStage && roN.newCount && roN.rec.bestStage === 10 && roN.rec.bestCount === 60 && JSON.stringify(roN.newSeen) === '[8,9,10]' && seenCount(roN.rec) === 9, JSON.stringify(roN.newSeen));
  const bad11 = loadRec({ getItem: () => '{"seen":[1,1,1,1,1,1,1,1,1,1,1,1,1,1],"bestStage":11,"bestCount":9,"plays":1}' });
  check('段階が範囲外の保存データ（段階 11・14 個の配列）でも 11 段階に収まる', bad11.seen.length === NS && bad11.bestStage === -1 && seenCount(bad11) === NS);
  let denied = true;
  try {
    const d = Object.getOwnPropertyDescriptor(window, 'localStorage');
    if (d && d.configurable) {
      Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('SecurityError'); } });
      try { denied = JSON.stringify(loadRec()) === JSON.stringify(emptyRec()) && saveRec(emptyRec()) === false; } catch (_) { denied = false; }
      Object.defineProperty(window, 'localStorage', d);
    }
  } catch (_) { /* 差し替えできない環境では確認を省く */ }
  check('localStorage への参照そのものが例外でも、読み書きは例外を出さない', denied);

  // 共有文
  const shareOk = ALLS.every(st => { const t = shareText(st, 37 + st); return t.includes(stageLabel(st)) || st === 0; });
  const texts = ALLS.map(st => shareText(st, 37 + st));
  check('共有文：段階の名前と連打数と #瓦割り が入る（段階 1〜10）', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].every(st => texts[st].includes('「' + stageLabel(st) + '」') || (st === 7 && texts[st].includes(stageLabel(7)))) && texts.every((t, i) => t.includes('連打 ' + (37 + i) + ' 回') && t.includes('#瓦割り')) && shareOk, texts[5]);
  check('共有文：段位が入る（段階 1〜6 は「五段」など、段階 7 は破門、8〜10 は永久破門・地球出禁・宇宙破門、段階 0 は出直し）', [1, 2, 3, 4, 5, 6].every(st => texts[st].includes('「' + rankFor(st) + '」')) && texts[7].includes('破門') && texts[0].includes('出直し') && [8, 9, 10].every(st => texts[st].includes('「' + rankFor(st) + '」')));
  check('共有文は短い（URL を足しても 140 字以内）', texts.every(t => t.length + 1 + 23 <= 140), texts.map(t => t.length).join(','));
  check('共有の URL と X の投稿画面の組み立て', CFG.shareUrl === 'https://fish-suika.github.io/kawarawari/' && tweetUrl(texts[5], CFG.shareUrl).startsWith('https://twitter.com/intent/tweet?text=') && tweetUrl(texts[5], CFG.shareUrl).includes(encodeURIComponent(CFG.shareUrl)));
  check('スマホは Web Share API、PC は X の投稿画面（端末の判定）',
    useWebShare('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 5) && useWebShare('Mozilla/5.0 (Linux; Android 14; Pixel 8)', 5) && useWebShare('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5) &&
    !useWebShare('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130', 0) && !useWebShare('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0) && !useWebShare('', 0));

  // 人の反応（段階ごと）
  const posAt = (S, t) => CAST.map((a, i) => castPose(a, i, S, t, { x: 0, pose: '', dir: 1, kneel: false, ph: 0 })).map(o => Object.assign({}, o));
  const poses = (S, t) => posAt(S, t).map(o => o.pose);
  const ids = new Set(CAST.map(a => a.id).concat(RESIDENTS.map((_, i) => 'r' + i), ['moon', 'star'], FOLK.map((_, i) => 'f' + i)));
  let bubOk = true, bubLast = true;
  for (let st = 0; st < NS; st++) {
    const sh = buildShow(st, 3), bs = sh.bubbles;
    for (const b of bs) if (!ids.has(b.who) || !(b.t0 < b.t1) || b.t0 >= sh.dur) bubOk = false;
    const spots = bs.map(b => bubbleSpot(b.who, st, Math.min(b.t0 + 0.01, sh.dur)));
    if (!spots.every(p => p && Number.isFinite(p.x) && Number.isFinite(p.y))) bubOk = false;
    if (!bs.length || !(bs[bs.length - 1].t1 === Infinity || st >= 5)) bubLast = bubLast && st >= 5;
  }
  check('吹き出し：全段階で、話す人がいて・見せ場の間に始まり・位置が正常', bubOk);
  const bt = st => buildShow(st, 3).bubbles.map(b => b.text).join('|');
  check('段階 0：師範「……次」／段階 1：まばらな拍手／段階 2：どよめき', bt(0).includes('……次') && bt(1).includes('パチ') && bt(2).includes('おお'), bt(0) + ' / ' + bt(1) + ' / ' + bt(2));
  check('段階 4：屋根が飛び見上げる／段階 5：住人の声／段階 6：山／段階 7：最後に「……破門」が残る',
    bt(4).includes('屋根') && bt(5).includes('うちが') && bt(6).includes('山') && bt(7).includes('……破門') && buildShow(7, 3).bubbles.slice(-1)[0].text === '……破門' && buildShow(7, 3).bubbles.slice(-1)[0].t1 === Infinity);
  check('段階 8：「大陸が……！」／段階 9：月と星が「ひび……！？」「ひえっ！」／段階 10：月「地球が……！？」と万歳の声が最後に残る', bt(8).includes('大陸が') && bt(9).includes('ひ、ひび') && bt(9).includes('ひえっ') && bt(10).includes('地球が') && bt(10).includes('ばんざーい') && [8, 9, 10].every(st => buildShow(st, 3).bubbles.slice(-1)[0].t1 === Infinity) && !bt(7).includes('大陸'), bt(10));
  check('段階 0 は悶える：師範は腕組み、門下生は目をそらす／段階 1 は一部が拍手／段階 2 は全員が驚く',
    poses(0, 0.8)[0] === 'fold' && poses(0, 0.8).slice(1).every(p => p === 'wince') && [0.5, 0.7, 0.95, 1.1, 1.3, 1.5].some(t => poses(1, t).includes('clap')) && poses(2, 1.0).every(p => p === 'gasp'), poses(1, 0.7).join());
  const xs = (S, t) => posAt(S, t).map(o => o.x);
  check('段階 3 以上：床が抜ける前に、門下生と師範は穴の範囲（x が ' + HX0 + ' より右）の外へ出る', [3, 4, 5, 6, 7].every(S => xs(S, 0.94).every(x => x < HX0)), xs(3, 0.94).map(v => v.toFixed(0)).join(','));
  check('段階 4 以上：道場から外へ逃げて立ち止まり、見上げる', [4, 5, 6, 7].every(S => poses(S, 1.8).slice(1).every(p => p === 'look')) && xs(4, 1.9).every((x, i) => Math.abs(x - fleeX(i)) < 0.01), xs(4, 1.9).map(v => v.toFixed(0)).join(','));
  check('段階 5 以上：その後さらに遠くへ走り去り、住人のいる高台より先で画面の外', [5, 6, 7, 8, 9, 10].every(S => xs(S, showDur(S)).every(x => x < -340)), xs(7, showDur(7)).map(v => v.toFixed(0)).join(','));
  // 崩れた物が人の上に落ちない（人は落下範囲の外）
  const landX = p => (p.kind === 'tilt' ? p.px : p.x + p.vx * (isFinite(p.tl) ? p.tl : 0));
  const hw = p => { let m = 0; for (let i = 0; i < p.poly.length; i += 2) m = Math.max(m, Math.abs(p.poly[i])); return m; };
  let minDebris = 1e9;
  for (let st = 4; st <= 10; st++) for (const p of buildShow(st, 2000 + st).pieces) if (p.g === 'dojo' && isFinite(p.tb)) minDebris = Math.min(minDebris, landX(p) - hw(p));
  const stopX = Math.max(...CAST.map((_, i) => fleeX(i)));
  check('道場の破片は、逃げた人が立つ場所（x=' + stopX + ' より左）に落ちない', minDebris > stopX + 8, '破片の左端 最小 ' + minDebris.toFixed(1));
  // 倒れる家の高さより、住人の立つ高台が高い
  const houseSpan = Math.max(...buildShow(5, 1).pieces.filter(p => p.g === 'house').map(p => p.poly[2] - p.poly[0]));
  check('住人の高台は、倒れた家（横になった高さ ' + houseSpan.toFixed(0) + '）より高く、住人は家の倒れる側に立たない', GY - HILL_TOP >= houseSpan + 2 && RESIDENTS.every(r => r.x < HILLS[0].x + 30 && r.x > HILLS[0].x - 30 || r.x < HILLS[1].x + 30 && r.x > HILLS[1].x - 30));
  check('見せ場の音の合図はすべて見せ場の間に鳴る（段階 8〜10 の地響き・静けさ・割れる音を含む）', ALLS.every(st => { const sh = buildShow(st, 3); return sh.cues.every(c => c.t >= 0 && c.t <= sh.dur + 1e-9); }));

  // 認定証の置き場所と、本人（足もと）がかぶらない配置
  const scr = [[390, 844], [375, 667], [360, 640], [412, 915], [768, 1024], [600, 1200], [844, 390], [1024, 768], [1280, 720], [1920, 1080], [2560, 1080]];
  const hid = [];
  for (const [w, h] of scr) for (let st = 0; st < NS; st++) {
    const cam = camAt(st, showDur(st)), box = certBox(w, h, 1.5), sft = resultShift(st, cam, w, h, box), v = viewFor(cam, w, h), kk = v.k * sft.z;
    const bot = resultBottom(st);
    const foot = h / 2 + (bot - cam.cy) * kk + sft.y, head = h / 2 + (resultTop(st) - cam.cy) * kk + sft.y, sx = w / 2 + ((st >= 3 ? KX + 1 : 62) - cam.cx) * kk + sft.x;
    if (st >= 9) { /* 段階 9〜10 は下の「地球ぜんぶ」の検査で見る */ }
    else if (box.portrait) { if (!(st >= 8 ? foot <= box.y - 4 : ((foot <= box.y - 4 || head < 28) && head >= 20))) hid.push(w + 'x' + h + ' 段階' + st + '（足 ' + foot.toFixed(0) + ' / 認定証の上端 ' + box.y.toFixed(0) + '）'); }
    else if (!(sx + 28 * kk <= box.x - 4 || sx <= box.x * 0.5 + 1)) hid.push(w + 'x' + h + ' 段階' + st);
    if (box.x < 0 || box.y < 0 || box.x + box.w > w + 0.5 || box.y + box.h > h + 0.5) hid.push(w + 'x' + h + ' 認定証が画面の外');
  }
  check(scr.length + ' 種類の画面 × 11 段階で、認定証（一覧が 3 行になる高さ）が画面内に収まり、本人の足もとにかぶらず、段階 9〜10 は地球ぜんぶが入る（絵をずらし・縮めて）', hid.length === 0, hid.slice(0, 4).join(' / ') || scr.length + ' 種類 × 11 段階');
  const bp = certBox(390, 844, 1.2), bl = certBox(1280, 720, 1.2);
  check('認定証：縦画面は下に寄せ（画面の 6 割まで）、横画面・PC は右側', bp.portrait && bp.y + bp.h <= 844 && bp.h <= 844 * 0.6 + 1 && bp.y > 844 * 0.38 && !bl.portrait && bl.x > 1280 / 2 && bl.h <= 720);

  // ===== 最終修正（2026-11-20）：段階 8〜10（宇宙へ）と、崩れた物の不具合 =====
  note('--- 最終修正：段階 8〜10（宇宙へ）・破片の不具合 ---');
  const spN = [8, 9, 10].map(st => spaceAt(st, showDur(st)));
  check('段階 8：最後は地平線が丸く見え（地面の丸み 1）、大陸が左右に開いている。まだ地球の外見には切り替わらない', spN[0].eps > 0.999 && spN[0].ang > ANG0 * 0.99 && spN[0].glb === 0 && spN[0].world === 1 && spN[0].crack === 1, JSON.stringify(spN[0]));
  check('段階 9：最後は宇宙から見た地球（外見 1）で、ひびが全体に広がり、町や山は見えない・割れ目は細く閉じている', spN[1].glb > 0.999 && spN[1].ecr > 0.999 && spN[1].world < 0.001 && spN[1].ang < ANG0 * 0.2 && spN[1].sp === 0, JSON.stringify(spN[1]));
  check('段階 10：最後は地球が割れて離れ（離れる 1）、中身が見える（外見はほぼ 0）。段階 9 までは離れない', spN[2].sp > 0.999 && spN[2].glb < 0.001 && spaceAt(9, showDur(9)).sp === 0 && spaceAt(7, 3.5).eps === 0);
  let epsMono = true, pe = 0; for (let t = 0; t <= showDur(10); t += 0.05) { const e = spaceAt(10, t).eps; if (e < pe - 1e-9) epsMono = false; pe = e; }
  check('カメラが引くにつれて地面が丸くなる（地面の丸みは引くほど増える）。段階 7 までは平ら（0）', epsMono && [0, 1, 2, 3, 4, 5, 6, 7].every(st => spaceAt(st, showDur(st)).eps === 0), 'eps(3.0)=' + spaceAt(10, 3.0).eps.toFixed(2));
  const L = xfPoint(spN[2], -1, PX - 100, GY), Rg = xfPoint(spN[2], 1, PX + 100, GY);
  check('段階 10：地球の左の半分は左へ、右の半分は右へ離れる（足場の柱は動かない）', L.x < PX - 100 - SPLITD * 0.9 && Rg.x > PX + 100 + SPLITD * 0.9 && Math.abs(halfXf(NOSP, -1).dx) === 0, L.x.toFixed(0) + ' / ' + Rg.x.toFixed(0));
  // 本人は穴の底に立つ（足場の柱はどこにもない）。穴を掘る間いっしょに下がり、段階 8〜10 では穴のある側の半分に乗ったまま動く
  const fy = S => heroFeet(S, showDur(S));
  check('段階 7：穴を掘る間、本人も底まで下がる（掘る前は下の階 y=' + BY + '、掘り終わりは穴の底 y=' + FLOOR_Y + '）。下がり方はなめらか（途中で上がらない・飛ばない）',
    Math.abs(heroFeet(7, 3.0).y - BY) < 0.5 && Math.abs(fy(7).y - FLOOR_Y) < 0.5 &&
    (() => { let prev = heroFeet(7, 3.0).y, ok = true; for (let t = 3.0; t <= CFG.craterT[1] + 1e-9; t += 0.01) { const y = heroFeet(7, t).y; if (y < prev - 0.01 || y - prev > 12) ok = false; prev = y; } return ok; })(),
    'y=' + heroFeet(7, 3.0).y.toFixed(1) + '→' + fy(7).y.toFixed(1));
  check('段階 8〜10：本人の足もとは、いつも穴の底の点（クレーターの中心）と同じ動き＝穴の底に乗ったまま（宙に浮かない・何もない所に立たない）',
    [8, 9, 10].every(S => [4.0, 4.9, 5.5, 6.2, showDur(S)].every(t => t > showDur(S) + 1e-9 || (() => { const sp = spaceAt(S, t), q = xfPoint(sp, -1, CR.x, craterTop(KX, craterAt(S, t))), f = heroFeet(S, t); return t < CFG.craterT[1] + 0.3 || Math.hypot(f.x - q.x, f.y - q.y) < 1; })())));
  const pS = spaceAt(10, showDur(10)), f10 = fy(10), f7 = fy(7);
  check('段階 10：本人は割れた地球の左の半分（クレーターのある側）に乗ったまま、左へ ' + SPLITD.toFixed(0) + ' ほど離れる。クレーターは割れる線（x=' + EX + '）より左に丸ごと入り、本人の大きく描いた足もとも左側',
    f10.x < f7.x - SPLITD * 0.9 && CR.x + CR.R + 20 <= EX && KX + 1 + 17 * HERO_MAX + 20 <= EX && pS.sp > 0.999 && fy(9).x < f7.x + 1 && Math.abs(fy(9).x - f7.x) < 120, 'x ' + f7.x.toFixed(0) + '→' + f10.x.toFixed(0));
  check('割れた地球の右の半分は右へ離れる（二つに離れた隙間が見える：ぜんぶ開いた隙間は半径の ' + (4 * SPLITD / (2 * PR) * 100).toFixed(0) + '%）', xfPoint(pS, 1, EX + 100, GY).x > EX + 100 + SPLITD * 0.9 && SPLITD * 2 >= PR * 0.39);
  check('本人を大きく見せる倍率は、穴の底の平らな部分（半幅 ' + CFL + '）に足が収まる大きさ以下（上限 ' + HERO_MAX + '）', HERO_MAX * 13 + 4 <= CFL * 2 && [0.03, 0.06, 0.1, 0.3, 1, 3].every(k => heroScale(10, k) <= HERO_MAX + 1e-9) && heroScale(2, 0.1) === 1);
  check('穴の底に立つ本人の光の輪（段階 3 以上）は引くほど強く、宇宙まで引いても画面で十分な大きさ（半径 36px 以上）', haloAmt(7, 0.03) === 1 && haloAmt(2, 0.03) === 0 && haloAmt(7, 3) === 0 && haloR(0.03) * 0.03 >= 36 - 1e-9);
  const zs = [[390, 844], [375, 667], [1280, 720], [1950, 1135], [1024, 768], [844, 390]].map(([w, h]) => { const b = certBox(w, h, 1.5); return [9, 10].map(st => resultShift(st, camAt(st, showDur(st)), w, h, b).z); });
  check('段階 9〜10 は、認定証の空きに合わせて絵を縮め／広げる（倍率 0.3〜1.35）。段階 8 以下は縮めない', zs.every(r => r.every(z => z > 0.3 && z <= 1.35 + 1e-9)) && [3, 7, 8].every(st => resultShift(st, camAt(st, showDur(st)), 390, 844, certBox(390, 844, 1.5)).z === 1), JSON.stringify(zs.map(r => r.map(z => +z.toFixed(2)))));

  // 段階 9・10 の結果画面：地球ぜんぶ（割れた二つの半分）・月と星・本人（光の輪つき）・残る吹き出しが、画面内で認定証と重ならない
  // （描画と同じ式：画面 x = W/2 + (世界 x − カメラ中心) × 倍率 + ずらし）。第 6 回までは 697×787 のような画面で、上の吹き出しと本人が上端で切れていた
  const fitScr = [[390, 844], [375, 812], [375, 667], [360, 640], [412, 915], [697, 787], [768, 1024], [600, 1200], [844, 390], [1024, 768], [1280, 720], [1950, 1135], [1920, 1080], [2560, 1080]];
  const fitBad = [], gaps = [];
  for (const [w, h] of fitScr) for (const st of [9, 10]) {
    const cam = camAt(st, showDur(st)), box = certBox(w, h, 1.5), sft = resultShift(st, cam, w, h, box), kk = viewFor(cam, w, h).k * sft.z;
    const X = wx => w / 2 + (wx - cam.cx) * kk + sft.x, Y = wy => h / 2 + (wy - cam.cy) * kk + sft.y, tag = w + 'x' + h + ' 段階' + st + ' ';
    const free = box.portrait ? { x0: 0, x1: w, y0: 0, y1: box.y } : { x0: 0, x1: box.x, y0: 0, y1: h };
    const inFree = (x0, y0, x1, y1, what) => { if (x0 < free.x0 - 0.5 || x1 > free.x1 + 0.5 || y0 < free.y0 - 0.5 || y1 > free.y1 + 0.5) fitBad.push(tag + what + '（' + [x0, y0, x1, y1].map(Math.round).join(',') + '）'); };
    const sdx = st >= 10 ? SPLITD : 0;
    inFree(X(EX - PR - sdx), Y(GY - 6), X(EX + PR + sdx), Y(PCY + PR), '地球');
    inFree(X(MOON.x - MOON.r), Y(MOON.y - MOON.r), X(MOON.x + MOON.r), Y(MOON.y + MOON.r), '月');
    inFree(X(STAR.x - STAR.r), Y(STAR.y - STAR.r), X(STAR.x + STAR.r), Y(STAR.y + STAR.r), '星');
    const sp = spaceAt(st, showDur(st)), ft = heroFeet(st, showDur(st)), sc = heroScale(st, kk), hr = Math.max(34 * kk, 36);   // 光の輪の画面での半径
    inFree(X(ft.x) - hr, Y(ft.y - 27) - hr, X(ft.x) + hr, Y(ft.y - 27) + hr, '本人の光の輪');
    inFree(X(ft.x) - 17 * sc * kk, Y(ft.y) - 31 * sc * kk, X(ft.x) + 17 * sc * kk, Y(ft.y), '本人');
    for (const b of bubblesFor(st)) {
      if (b.t1 !== Infinity) continue;
      const q = bubbleSpot(b.who, st, showDur(st), kk), bw = b.text.length * 14 + 18, hh = 27 + 9;
      inFree(Math.max(0, Math.min(X(q.x) - bw / 2, free.x1 - 6 - bw)), Y(q.y) - hh, Math.max(bw + 6, Math.min(X(q.x) + bw / 2, free.x1 - 6)), Y(q.y), '吹き出し「' + b.text + '」');
    }
    if (st === 10) gaps.push(2 * SPLITD * kk);
    if (box.portrait ? Y(PCY + PR) > box.y - 2 : X(EX + PR + sdx) > box.x - 2) fitBad.push(tag + '地球が認定証にかぶる');
  }
  check(fitScr.length + ' 種類の画面（縦 375×812・697×787 ほか、横・PC）の段階 9・10 の結果で、地球の円・月と星・本人と光の輪・残る吹き出しがすべて画面内、かつ認定証と重ならない', fitBad.length === 0, fitBad.slice(0, 4).join(' / ') || fitScr.length + ' 種類 × 2 段階');
  check('段階 10 の結果：二つに離れた隙間が画面ではっきり見える（どの画面でも 24px 以上）', gaps.length === fitScr.length && Math.min(...gaps) >= 24, '最小 ' + Math.min(...gaps).toFixed(0) + 'px');

  // 崩れた物（屋根・壁・柱・床板・台）が、本人の足もとに縦に立ったり重なったりしない
  const ZC0 = KX + 8, ZR0 = 36;
  let zoneBad = [], tallBad = [], roofMax = 0, pillarBad = 0, angBad = 0, nBig = 0;
  for (let st = 3; st <= 10; st++) for (const sd of [11, 222, 3333, 44444]) {
    const sh = buildShow(st, sd + st);
    for (const p of sh.pieces) {
      if (!isFinite(p.tb) || !(p.g === 'dojo' || p.g === 'slab' || p.g === 'stand') || !isFinite(p.tl)) continue;
      nBig++;
      const xl = p.x + p.vx * (p.tl + 0.06);
      if (Math.abs(xl - ZC0) < ZR0 + p.ex - 0.5) zoneBad.push('段階' + st + ' ' + p.g + ' 着地 x=' + xl.toFixed(0) + ' 半幅' + p.ex.toFixed(0));
      if (p.edge === '#8a3a2a') roofMax = Math.max(roofMax, p.hh * 2);
      if (2 * p.hh > 40.5) tallBad.push('段階' + st + ' ' + p.g + ' 高さ' + (2 * p.hh).toFixed(0));
      if (st >= 7) { const o2 = poseAt(p, sh.dur + 3, { x: 0, y: 0, a: 0, al: 1, s: 1 }); if (o2.al > 0.02 && Math.abs(o2.x - CR.x) < CR.R * 0.9 && o2.y > GY + 5) pillarBad++; }   // 穴の中に残る破片
      const o = poseAt(p, sh.dur + 3, { x: 0, y: 0, a: 0, al: 1, s: 1 });   // 結果のあと（着地して落ち着いた姿勢）
      if (p.lie ? Math.abs(Math.cos(o.a)) > 0.02 : Math.abs(Math.sin(o.a)) > 0.02) angBad++;
    }
  }
  check('段階 3〜10 のどの見せ場でも、崩れた物は本人の足もと（x=' + ZC0 + ' の左右 ' + ZR0 + '＋物の幅）に着地しない', zoneBad.length === 0 && nBig > 500, zoneBad.slice(0, 3).join(' / ') || '対象 ' + nBig + ' 個');
  check('崩れた物は着地して横になる（縦に立ったまま止まらない）：落ち着いた向きが、背の低い向き（長い辺が横）', angBad === 0, 'bad=' + angBad);
  check('屋根は薄い板に分かれて飛ぶ（1 枚の高さ ' + roofMax.toFixed(1) + ' 以下）。着地して立つ高さは壁でも ' + 40 + ' 以下', roofMax > 0 && roofMax <= 14.5 && tallBad.length === 0, tallBad.slice(0, 3).join(' / '));
  check('段階 7〜10：穴の中（本人の立つ底・壁）に、屋根・柱・壁・床板の破片が残らない（穴の底は本人だけ）', pillarBad === 0, 'bad=' + pillarBad);
  const roofN = st => buildShow(st, 5).pieces.filter(p => p.edge === '#8a3a2a').length;
  check('屋根の板の数は 20〜60 枚で、全段階の破片の合計が上限（' + CFG.maxPieces + '）以内', roofN(4) >= 20 && roofN(4) <= 60 && ALLS.every(st => buildShow(st, 5).pieces.length <= CFG.maxPieces), roofN(4) + ' 枚');
  startPlay(); Game.count = TOP; advance(CFG.duration + 0.01); while (Game.mode === 'finish') Game.step(CFG.h);
  advance(1.0);
  check('見せ場の時刻は速さ（段階 10 は ' + CFG.showSpeed[10] + ' 倍）に合わせて進む：1 秒で ' + CFG.showSpeed[10] + ' 単位', Math.abs(Game.showT - CFG.showSpeed[10] * 1.0) < 0.03 && Math.abs(Game.showR - 1.0) < 0.03, 'showT=' + Game.showT.toFixed(3));

  const s = document.createElement('h2');
  s.textContent = fail === 0 ? '全部 OK（' + (total - fail) + '/' + total + '）' : 'NG が ' + fail + ' 件（OK ' + (total - fail) + '/' + total + '）';
  s.className = fail === 0 ? 'ok' : 'ng';
  out.insertBefore(s, out.firstChild);
  window.__verifyFail = fail;
})();
