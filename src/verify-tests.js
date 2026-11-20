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
  check('5 秒たつと連打が終わる（せいっ）', Game.mode === 'finish' || Game.mode === 'over', Game.mode);
  const c0 = Game.count;
  const r = Game.tap();
  check('締め切り後の入力は数えない', r === 'ignored' && Game.count === c0, 'count=' + Game.count);
  advance(CFG.finishSecs + 0.1);
  check('「せいっ」のあと結果へ', Game.mode === 'over');
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
  startPlay(); advance(CFG.duration + CFG.finishSecs + 0.05);
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
