// ===== ゲームのロジック（画面を使わない）=====
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// 連打数 → 段階（0〜7）
function stageFor(count) {
  let s = 0;
  for (let i = 0; i < CFG.levelAt.length; i++) if (count >= CFG.levelAt[i]) s = i + 1;
  return s;
}
// 連打数 → オーラの段（10 回ごとに一段）
function tierFor(count) { return Math.min(CFG.maxTier, Math.floor(count / CFG.tierEvery)); }

// キー入力を数えてよいか（スペース・Enter、押しっぱなしの連続入力は数えない）
function acceptKey(e) {
  if (e.repeat) return false;
  return e.key === ' ' || e.key === 'Enter' || e.code === 'Space';
}

const Game = {
  mode: 'title',   // title → ready → play → finish → over
  t: 0, readyT: 0, finT: 0, overT: 0,
  count: 0, hits: [],      // hits: 数えた時刻（直近1秒の窓の判定に使う）
  events: [],

  reset() {
    this.mode = 'title';
    this.t = 0; this.readyT = 0; this.finT = 0; this.overT = 0;
    this.count = 0; this.hits = [];
    this.events = [];
  },

  begin() {
    if (this.mode !== 'title') return;
    this.mode = 'ready'; this.readyT = 0;
    this.events.push({ type: 'ready' });
  },

  stage() { return stageFor(this.count); },
  tier() { return tierFor(this.count); },
  remaining() { return Math.max(0, CFG.duration - this.t); },
  canRetry() { return this.mode === 'over' && this.overT >= CFG.retryWait; },

  // 連打 1 回。'hit' 数えた / 'limited' 速すぎて数えない / 'ignored' 受付外（はじめ前・締め切り後）
  tap() {
    if (this.mode !== 'play' || this.t >= CFG.duration - 1e-9) return 'ignored';
    const h = this.hits;
    while (h.length && this.t - h[0] >= 1 - 1e-9) h.shift();
    if (h.length >= CFG.maxPerSec) return 'limited';
    h.push(this.t);
    this.count++;
    this.events.push({ type: 'hit', count: this.count, tier: this.tier(), tierUp: this.count % CFG.tierEvery === 0 && this.count / CFG.tierEvery <= CFG.maxTier });
    return 'hit';
  },

  step(dt) {
    if (this.mode === 'ready') {
      this.readyT += dt;
      if (this.readyT >= CFG.readySecs) { this.mode = 'play'; this.t = 0; this.hits = []; this.events.push({ type: 'start' }); }
      return;
    }
    if (this.mode === 'play') {
      this.t += dt;
      if (this.t >= CFG.duration - 1e-9) {
        this.t = CFG.duration;
        this.mode = 'finish'; this.finT = 0;
        this.events.push({ type: 'end', count: this.count, stage: this.stage() });
      }
      return;
    }
    if (this.mode === 'finish') {
      this.finT += dt;
      if (this.finT >= CFG.finishSecs) { this.mode = 'over'; this.overT = 0; this.events.push({ type: 'over' }); }
      return;
    }
    if (this.mode === 'over') this.overT += dt;
  },
};
