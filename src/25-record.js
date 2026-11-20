// ===== 段位・記録・共有（画面を使わない）=====
// 段位。8〜10 は破門の先のおかしな段位（本人の最終修正 2026-11-20 で追加）
const RANKS = ['出直し', '初段', '二段', '三段', '四段', '五段', '名誉師範', '破門', '永久破門', '地球出禁', '宇宙破門'];
const NST = CFG.stageNames.length;   // 段階の数（11）
// 師範のひとこと（文節ごとに区切る。画面では文節の途中で改行しない）
const VERDICTS = [
  ['瓦が割れるまで、', '出直してまいれ'],
  ['右の者、', '瓦を割ったことを', '認める'],
  ['右の者、', '瓦を全部', '割ったことを', '認める'],
  ['右の者、', '道場の床まで', '割ったことを', '認める'],
  ['右の者、', '道場を', '全壊させたことを', '認める'],
  ['右の者、', '町内を', '全壊させたことを', '認める'],
  ['右の者、', '山まで', '割ったゆえ', '名誉師範とする'],
  ['右の者、', '割りすぎにつき', '破門とする'],
  ['右の者、', '大陸を', '真っ二つにしたゆえ', '永久に', '破門とする'],
  ['右の者、', '地球に', 'ひびを入れたゆえ', '地球への', '立ち入りを', '禁ずる'],
  ['右の者、', '地球を', '割りすぎたゆえ', '宇宙より', '破門とする'],
];

const rankFor = s => RANKS[clamp(s, 0, NST - 1)];
const certTitle = s => (s >= 7 ? '破門状' : '段位認定証');
const stageLabel = s => CFG.stageNames[clamp(s, 0, NST - 1)].replace(/ /g, '');      // 文章用（空白なし）
const tilesBroken = s => (s <= 0 ? 0 : s === 1 ? 5 : CFG.tiles);
const tileText = s => (s >= 2 ? CFG.tiles + ' 枚（と、その他）' : tilesBroken(s) + ' 枚');
// 見た段階：段階 0・1 はその結果に届いたとき、段階 2 以上は見せ場で順に見るので、届いた段階までの 2〜S
function seenFor(s) {
  const a = [];
  if (s <= 1) a.push(s); else for (let i = 2; i <= s; i++) a.push(i);
  return a;
}

// ---- 記録（自己ベストと見た段階）。保存できなくても動く ----
const REC_KEY = 'kawarawari.record.v1';
const emptyRec = () => ({ seen: new Array(NST).fill(0), bestStage: -1, bestCount: 0, plays: 0 });   // 古い保存データ（8 段階分）は足りない分を 0 にして読む
function cleanRec(x) {   // 壊れた保存データでも安全な形にそろえる
  const r = emptyRec();
  if (!x || typeof x !== 'object') return r;
  if (Array.isArray(x.seen)) for (let i = 0; i < NST; i++) r.seen[i] = x.seen[i] ? 1 : 0;
  const bs = Number(x.bestStage), bc = Number(x.bestCount), pl = Number(x.plays);
  r.bestStage = Number.isInteger(bs) && bs >= -1 && bs <= NST - 1 ? bs : -1;
  r.bestCount = Number.isFinite(bc) && bc >= 0 && bc < 1e6 ? Math.floor(bc) : 0;
  r.plays = Number.isFinite(pl) && pl >= 0 && pl < 1e9 ? Math.floor(pl) : 0;
  return r;
}
function safeStore() { try { return typeof localStorage === 'undefined' ? null : localStorage; } catch (_) { return null; } }
function loadRec(store) {
  try {
    const s = store === undefined ? safeStore() : store;
    if (!s) return emptyRec();
    const raw = s.getItem(REC_KEY);
    return raw ? cleanRec(JSON.parse(raw)) : emptyRec();
  } catch (_) { return emptyRec(); }
}
function saveRec(rec, store) {
  try {
    const s = store === undefined ? safeStore() : store;
    if (!s) return false;
    s.setItem(REC_KEY, JSON.stringify(rec));
    return true;
  } catch (_) { return false; }
}
// 1 回の結果を記録に足す。first：初めての挑戦（更新の表示は出さない）
function applyResult(rec, stage, count) {
  const prev = cleanRec(rec), next = cleanRec(rec), first = prev.plays === 0, seen = seenFor(stage);
  const newSeen = seen.filter(i => !prev.seen[i]);
  for (const i of seen) next.seen[i] = 1;
  next.plays = prev.plays + 1;
  const newStage = stage > prev.bestStage, newCount = count > prev.bestCount;
  if (newStage) next.bestStage = stage;
  if (newCount) next.bestCount = count;
  return { rec: next, first, newStage: newStage && !first, newCount: newCount && !first, newSeen };
}
const seenCount = rec => rec.seen.reduce((a, b) => a + (b ? 1 : 0), 0);

// ---- 共有 ----
function shareText(stage, count) {
  const nm = stageLabel(stage);
  let body;
  if (stage >= 8) body = '瓦割り（仮）で「' + rankFor(stage) + '」になりました。「' + nm + '」まで割った（連打 ' + count + ' 回）';
  else if (stage >= 7) body = '瓦割り（仮）で「破門」されました。' + nm + 'を作った（連打 ' + count + ' 回）';
  else if (stage === 0) body = '瓦割り（仮）で「出直し」と言われた……（連打 ' + count + ' 回）';
  else body = '瓦割り（仮）で「' + rankFor(stage) + '」に認定！「' + nm + '」まで届いた（連打 ' + count + ' 回）';
  return body + ' #瓦割り';
}
// スマホ（タッチ端末）は Web Share API、PC は X の投稿画面
function useWebShare(ua, touchPoints) {
  return /Android|iPhone|iPad|iPod/i.test(ua || '') || (/Macintosh/i.test(ua || '') && touchPoints > 1);
}
function tweetUrl(text, url) {
  return 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(url);
}
