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
  const cases = [[0, 0], [9, 0], [10, 1], [19, 1], [20, 2], [29, 2], [30, 3], [39, 3], [40, 4], [49, 4], [50, 5], [59, 5], [60, 6], [69, 6], [70, 7], [71, 7], [200, 7]];
  const bad = cases.filter(([n, s]) => stageFor(n) !== s).map(([n, s]) => n + '→' + stageFor(n) + '(want ' + s + ')');
  check('連打数ごとの段階（9→0, 10→1, 19→1, 20→2, …, 69→6, 70→7）', bad.length === 0, bad.join(' ') || cases.map(([n]) => n + '→' + stageFor(n)).join(' '));
  check('段階は 0〜7 の 8 段階（しきい値 7 つ）', CFG.levelAt.length === 7 && CFG.stageNames.length === 8);
  check('オーラの段は 10 回ごとに 1 つ上がる（9→0, 10→1, 70→7, 100→7）', tierFor(9) === 0 && tierFor(10) === 1 && tierFor(70) === 7 && tierFor(100) === 7);

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
  const want = { 4: 2, 8: 4, 12: 6, 15: 7 };
  const botRes = {};
  for (const rate of [4, 8, 12, 15]) {
    const b = bot(rate); botRes[rate] = b;
    check('毎秒 ' + rate + ' 回 × 5 秒 → ' + b.count + ' 回 → 段階 ' + b.stage + '（' + CFG.stageNames[b.stage] + '）', b.stage === want[rate], '想定 段階' + want[rate]);
  }
  note('ボット一覧：' + [4, 8, 12, 15].map(r => '毎秒' + r + '回=' + botRes[r].count + '回/段階' + botRes[r].stage).join('、'));

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
  const counts = [0, 10, 20, 30, 40, 50, 60, 70], lens = [];
  for (let st = 0; st < 8; st++) {
    const r = runShow(counts[st]); lens.push(r.sh);
    check('段階 ' + st + ' の見せ場は ' + r.sh.toFixed(2) + ' 秒で結果へ（上限 ' + CFG.showMax + ' 秒）', r.stage === st && r.mode === 'over' && r.sh <= CFG.showMax + 0.02 && Math.abs(r.sh - CFG.showSecs[st]) < 0.02, 'stage=' + r.stage + ' mode=' + r.mode);
  }
  let mono = true; for (let i = 1; i < 8; i++) if (!(lens[i] > lens[i - 1])) mono = false;
  check('見せ場は段階が高いほど長い（単調増加）', mono, lens.map(v => v.toFixed(2)).join(' < '));
  check('段階 0〜1 はすぐ結果へ（1.5 秒以内）、最高段階も約 4 秒以内', lens[0] <= 1.5 && lens[1] <= 1.5 && lens[7] <= 4.02);

  // 早送り
  startPlay(); Game.count = 70; advance(CFG.duration + 0.01);
  while (Game.mode === 'finish') Game.step(CFG.h);
  advance(CFG.skipGrace * 0.5);
  check('見せ場の最初のうち（連打の指が残る間）は早送りにしない', Game.mode === 'show' && Game.skip() === false && Game.mode === 'show');
  advance(CFG.skipGrace);
  const tBefore = Game.showT, durBefore = Game.show.dur;
  const sk = Game.skip();
  check('早送り入力で直ちに結果へ移る（見せ場の途中から）', sk === true && Game.mode === 'over' && Game.overT === 0 && tBefore < durBefore, 'showT=' + tBefore.toFixed(2));
  advance(CFG.retryWait + 0.01);
  check('早送りのあと 0.5 秒で再挑戦でき、連打数・段階は変わらない', Game.canRetry() && Game.count === 70 && Game.stage() === 7);
  check('見せ場でない間の早送りは何もしない', Game.skip() === false);

  // 破片の数・再現性
  let maxPieces = 0, maxBroken = 0;
  for (let st = 0; st < 8; st++) {
    const s = buildShow(st, CFG.seed + counts[st]);
    maxPieces = Math.max(maxPieces, s.pieces.length);
    maxBroken = Math.max(maxBroken, s.pieces.filter(p => isFinite(p.tb)).length);
  }
  check('破片の数が上限（' + CFG.maxPieces + '）を超えない（全段階）', maxPieces <= CFG.maxPieces, '最大 ' + maxPieces + '（うち飛ぶもの ' + maxBroken + '）');
  const sig = s => JSON.stringify(s.pieces.map(p => [p.x, p.y, p.vx, p.vy, p.w, p.tb, p.fy]));
  check('同じシードなら同じ壊れ方（再現できる）', sig(buildShow(7, 12345)) === sig(buildShow(7, 12345)));
  check('シードが違えば飛び方が変わる', sig(buildShow(7, 12345)) !== sig(buildShow(7, 54321)));
  let badN = 0;
  for (let st = 0; st < 8; st++) {
    const s = buildShow(st, 99);
    for (const t of [0, 0.5, 1, 2, 3, 4, 6]) for (const p of s.pieces) { const o = poseAt(p, t, { x: 0, y: 0, a: 0, al: 1, s: 1 }); if (![o.x, o.y, o.a, o.al, o.s].every(Number.isFinite)) badN++; }
  }
  check('どの時刻でも破片の位置が正常な数値（早送り・結果のあとも）', badN === 0, 'bad=' + badN);

  // 段階ごとに壊れる範囲がはっきり違う
  const groups = st => { const s = buildShow(st, 7), g = {}; for (const p of s.pieces) if (isFinite(p.tb) && p.g !== 'puff') g[p.g] = (g[p.g] || 0) + 1; return g; };
  const G = [0, 1, 2, 3, 4, 5, 6, 7].map(groups), keys = g => Object.keys(g).sort().join(','), sum = g => Object.values(g).reduce((a, b) => a + b, 0);
  check('段階 0：何も割れない（ひびだけ）', Object.keys(G[0]).length === 0);
  check('段階 1：瓦が数枚だけ（5 枚 = 15 片）、段階 2：瓦が全部（20 枚 = 60 片）', G[1].tile === 15 && keys(G[1]) === 'tile' && G[2].tile === 60 && keys(G[2]) === 'tile', keys(G[1]) + ' / ' + keys(G[2]));
  check('段階 3：台と床が加わる', G[3].stand === 2 && G[3].slab > 0 && !G[3].dojo, keys(G[3]));
  check('段階 4：道場の建物が加わる', G[4].dojo > 20 && !G[4].house, keys(G[4]));
  check('段階 5：家と電柱が加わる（家 6 軒・電柱 4 本）', G[5].house === 12 && G[5].pole === 4 && !G[5].mountain, keys(G[5]));
  check('段階 6：裏山が割れる', G[6].mountain === 2 && G[6].rock > 0 && !G[6].dirt, keys(G[6]));
  check('段階 7：地面（クレーター）が加わる', G[7].dirt > 50, keys(G[7]));
  check('壊れる破片の数が段階ごとに増える', [1, 2, 3, 4, 5, 6, 7].every(i => sum(G[i]) > sum(G[i - 1])), G.map(sum).join(' < '));
  const area = i => CAMS[i].w * CAMS[i].h;
  check('カメラが段階ごとに一段引く（範囲が必ず広がる）', [3, 4, 5, 6, 7].every(i => area(i) > area(i - 1)));
  const cams = [0, 1, 2, 3, 4, 5, 6, 7].map(st => camAt(st, CFG.showSecs[st]));
  check('見せ場の終わりのカメラが段階の設定どおり', cams.every((c, i) => Math.abs(c.w - CAMS[i].w) < 0.01 && Math.abs(c.cy - CAMS[i].cy) < 0.01));
  const midc = camAt(7, CFG.camAt[7] + CFG.camDur[7] / 2);
  check('カメラは連続して動く（引いている途中は前後の中間）', midc.w > CAMS[6].w && midc.w < CAMS[7].w);

  // 画面の縦横比ごとに、引いたカメラが必要な範囲を覆う（はみ出さない）
  const asp = [[390, 844], [375, 667], [360, 800], [768, 1024], [844, 390], [1024, 768], [1280, 720], [1920, 1080], [2560, 1080], [600, 1200]];
  const off = [];
  for (const [w, h] of asp) for (let st = 0; st < 8; st++) {
    const v = viewFor(CAMS[st], w, h), e = EXTENT[st];
    if (!(v.x0 <= e.x0 && v.x1 >= e.x1 && v.y0 <= e.y0 && v.y1 >= e.y1)) off.push(w + 'x' + h + ' 段階' + st);
  }
  check('縦・横・PC の 10 種類の画面で、どの段階も必要な範囲が画面に入る', off.length === 0, off.join(', ') || asp.length + ' 種類 × 8 段階');
  check('クレーター：足場の柱は残り、まわりは深く掘れる', craterTop(PX, 1) === BY && craterTop(CR.x + 100, 1) > BY + 100 && craterTop(CR.x + CR.R + 20, 1) === GY && craterTop(CR.x + 100, 0) === GY);
  check('大きな文字は段階ごとに用意（段階 7 は 6 つ：瓦、全部〜クレーター）', buildShow(7, 1).caps.length === 6 && buildShow(0, 1).caps.length === 1 && buildShow(1, 1).caps.length === 1);

  // --- 連打の反応（イベント）---
  startPlay();
  for (let i = 0; i < 20; i++) { Game.tap(); advance(0.05); }
  const ev = Game.events.filter(e => e.type === 'hit');
  check('数えた連打ごとに必ず反応のイベントが出る', ev.length === 20 && Game.count === 20, 'events=' + ev.length);
  check('10 回ごとに「一段派手」のイベントが出る', ev.filter(e => e.tierUp).map(e => e.count).join(',') === '10,20');

  const s = document.createElement('h2');
  s.textContent = fail === 0 ? '全部 OK（' + (total - fail) + '/' + total + '）' : 'NG が ' + fail + ' 件（OK ' + (total - fail) + '/' + total + '）';
  s.className = fail === 0 ? 'ok' : 'ng';
  out.insertBefore(s, out.firstChild);
  window.__verifyFail = fail;
})();
