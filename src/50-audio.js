// ===== 効果音（WebAudio で合成。音声ファイルなし・BGMなし。太鼓の連打が音楽の代わり）=====
const Snd = (() => {
  let ac = null, master = null, noiseBuf = null, bus = null;   // bus：見せ場の音の出口（早送りで一気に止められる）
  const recent = [];   // 直近に鳴らした太鼓の時刻（重なりすぎの間引きに使う）
  const live = [];     // 鳴っている音の終わる時刻（同時に鳴りすぎたら新しい音を間引く）
  const MAX_VOICES = 36;
  function room(t, dur) {
    while (live.length && live[0] < t) live.shift();
    if (live.length >= MAX_VOICES) return false;
    live.push(t + dur); live.sort((x, y) => x - y);
    return true;
  }

  function init() {
    if (!ac) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ac = new AC();
        const comp = ac.createDynamicsCompressor();   // 重なっても割れないように
        comp.threshold.value = -16; comp.ratio.value = 8;
        master = ac.createGain(); master.gain.value = 0.55;   // 全体の音量の上限
        master.connect(comp); comp.connect(ac.destination);
        noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      } catch (_) { ac = null; return; }
    }
    if (ac.state === 'suspended') ac.resume();
  }
  const now = () => ac.currentTime;
  const dest = () => bus || master;

  function tone(f, t0, dur, o) {
    if (!ac) return;
    o = o || {};
    if (!room(t0, dur)) return;
    const osc = ac.createOscillator(), g = ac.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(f, t0);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t0 + dur);
    const a = o.attack || 0.004, v = o.gain == null ? 0.3 : o.gain;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(dest());
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }
  function noise(t0, dur, o) {
    if (!ac || !room(t0, dur)) return;
    const src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const fl = ac.createBiquadFilter(); fl.type = o.type || 'bandpass';
    fl.frequency.setValueAtTime(o.f, t0); fl.Q.value = o.q || 1;
    if (o.f2) fl.frequency.exponentialRampToValueAtTime(o.f2, t0 + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(Math.max(0.0001, o.gain == null ? 0.3 : o.gain), t0 + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(fl); fl.connect(g); g.connect(dest());
    src.start(t0, Math.random()); src.stop(t0 + dur + 0.05);
  }

  return {
    init,
    // 太鼓：連打が増えるほど高く、強く
    taiko(count) {
      if (!ac) return; const t = now();
      while (recent.length && t - recent[0] > 0.1) recent.shift();
      if (recent.length >= 4) return;   // 重なりすぎたら間引く
      recent.push(t);
      const k = Math.min(count, CFG.topCount) / CFG.topCount;
      const f = 78 + k * 150, v = 0.2 + k * 0.22;
      tone(f * 1.7, t, 0.13, { gain: v, f2: f });
      tone(f * 0.5, t, 0.2, { gain: v * 0.6, f2: f * 0.42 });
      noise(t, 0.04, { f: 1500 + k * 900, q: 0.9, gain: 0.08 + k * 0.08 });
    },
    // 段階の区切りごとのご褒美の音
    tier(tier) {
      if (!ac) return; const t = now();
      const f = 440 * Math.pow(2, Math.min(tier, 10) * 2 / 12);
      tone(f, t, 0.18, { type: 'triangle', gain: 0.1 });
      tone(f * 1.5, t + 0.05, 0.18, { type: 'triangle', gain: 0.08 });
    },
    // 「はじめ」の気合
    hajime() {
      if (!ac) return; const t = now();
      tone(220, t, 0.22, { type: 'sawtooth', gain: 0.1, f2: 160 });
      noise(t, 0.16, { f: 900, q: 1.1, gain: 0.12 });
    },
    // 「せいっ」：振り下ろして一撃
    sei() {
      if (!ac) return; const t = now();
      tone(330, t, 0.2, { type: 'sawtooth', gain: 0.12, f2: 200 });
      tone(120, t + 0.08, 0.35, { gain: 0.5, f2: 45 });
      noise(t + 0.08, 0.25, { f: 2500, f2: 600, q: 0.7, gain: 0.35 });
    },

    // ---- Phase 2：破壊の見せ場（音量は小さめ。全体の上限とコンプレッサーを通る）----
    showBegin() {
      if (!ac) return;
      bus = ac.createGain(); bus.gain.value = 1; bus.connect(master);
    },
    showEnd(cut) {   // cut：早送り。残っている音をすぐ止める
      if (!ac || !bus) return;
      if (cut) { bus.gain.setTargetAtTime(0, now(), 0.025); }
      bus = null;
    },
    cue(name) {
      if (!ac) return; const t = now();
      if (name === 'crack') {            // 瓦にひび：ピシッ
        noise(t, 0.05, { type: 'highpass', f: 3500, q: 0.7, gain: 0.22 });
        tone(1800, t, 0.06, { type: 'square', gain: 0.05, f2: 700 });
      } else if (name === 'tile') {      // 瓦が割れる：パリパリッ
        noise(t, 0.14, { f: 3200, f2: 1400, q: 0.8, gain: 0.2 });
        tone(980 + Math.random() * 300, t, 0.09, { type: 'triangle', gain: 0.09, f2: 420 });
        noise(t + 0.05, 0.1, { type: 'highpass', f: 4500, q: 0.7, gain: 0.12 });
      } else if (name === 'thud') {      // ドスッ
        tone(95, t, 0.28, { gain: 0.4, f2: 38 });
        noise(t, 0.14, { type: 'lowpass', f: 400, q: 0.7, gain: 0.25 });
      } else if (name === 'floor') {     // 床が割れる：バキバキッ
        noise(t, 0.4, { f: 1200, f2: 300, q: 0.8, gain: 0.28 });
        tone(140, t, 0.3, { type: 'sawtooth', gain: 0.1, f2: 60 });
        noise(t + 0.08, 0.2, { type: 'highpass', f: 2500, q: 0.7, gain: 0.14 });
      } else if (name === 'whoosh') {    // 屋根が飛ぶ：ヒュオーッ
        noise(t, 0.55, { f: 400, f2: 2800, q: 1.2, gain: 0.22 });
      } else if (name === 'collapse') {  // 崩れる：ガラガラ
        noise(t, 0.8, { type: 'lowpass', f: 1400, f2: 180, q: 0.8, gain: 0.34 });
        noise(t + 0.15, 0.5, { f: 700, f2: 250, q: 0.9, gain: 0.18 });
        tone(80, t, 0.5, { gain: 0.3, f2: 36 });
      } else if (name === 'topple') {    // 倒れる：ズシン
        tone(70, t, 0.3, { gain: 0.28, f2: 32 });
        noise(t, 0.2, { type: 'lowpass', f: 600, q: 0.7, gain: 0.18 });
      } else if (name === 'rumble') {    // 地響き
        tone(46, t, 0.9, { gain: 0.3, f2: 30, attack: 0.08 });
        noise(t, 0.9, { type: 'lowpass', f: 140, q: 0.7, gain: 0.26 });
      } else if (name === 'mountain') {  // 山が割れる：ゴゴゴッ
        tone(55, t, 1.0, { gain: 0.4, f2: 28, attack: 0.1 });
        noise(t, 1.0, { type: 'lowpass', f: 300, f2: 90, q: 0.8, gain: 0.34 });
        noise(t + 0.1, 0.3, { f: 2000, f2: 500, q: 0.8, gain: 0.16 });
      } else if (name === 'crash') {
        noise(t, 0.5, { f: 1800, f2: 300, q: 0.7, gain: 0.26 });
        tone(110, t, 0.4, { gain: 0.3, f2: 40 });
      } else if (name === 'wah') {       // 失敗：しょんぼり（ぼよーん）
        tone(392, t, 0.55, { type: 'triangle', gain: 0.16, f2: 196 });
        tone(370, t + 0.02, 0.55, { type: 'triangle', gain: 0.08, f2: 180 });
      } else if (name === 'clap') {      // まばらな拍手：パチ…
        noise(t, 0.05, { type: 'highpass', f: 2200, q: 0.8, gain: 0.2 });
        noise(t + 0.18, 0.05, { type: 'highpass', f: 2600, q: 0.8, gain: 0.14 });
        noise(t + 0.33, 0.05, { type: 'highpass', f: 2000, q: 0.8, gain: 0.1 });
      } else if (name === 'crowd') {     // どよめき：おおお
        noise(t, 0.7, { f: 520, f2: 760, q: 2.2, gain: 0.2 });
        noise(t + 0.03, 0.7, { f: 900, f2: 1250, q: 2.6, gain: 0.12 });
        noise(t + 0.06, 0.6, { f: 330, f2: 420, q: 2, gain: 0.14 });
      } else if (name === 'run') {       // 逃げる足音：タタタタ
        for (let i = 0; i < 6; i++) noise(t + i * 0.09, 0.04, { type: 'lowpass', f: 700, q: 0.8, gain: 0.12 });
      } else if (name === 'gong') {      // 破門：ゴォーン
        this.gongAt(t, 1);
      } else if (name === 'rise') {      // カメラが空へ引く：ヒュイーン
        tone(220, t, 0.7, { gain: 0.14, f2: 1400, attack: 0.1 });
        noise(t, 0.7, { f: 600, f2: 3000, q: 1.2, gain: 0.1 });
      } else if (name === 'rift') {      // 大陸に地割れ：ゴゴゴ＋ピシピシ
        noise(t, 0.6, { type: 'lowpass', f: 260, f2: 80, q: 0.8, gain: 0.3 });
        for (let i = 0; i < 5; i++) noise(t + i * 0.09, 0.05, { type: 'highpass', f: 3000, q: 0.8, gain: 0.14 });
        tone(50, t, 0.7, { gain: 0.3, f2: 30, attack: 0.08 });
      } else if (name === 'quake') {     // 大陸が割れて開く：どどーん
        tone(40, t, 1.4, { gain: 0.5, f2: 24, attack: 0.02 });
        noise(t, 1.2, { type: 'lowpass', f: 500, f2: 60, q: 0.7, gain: 0.4 });
        noise(t, 0.3, { f: 2200, f2: 300, q: 0.7, gain: 0.2 });
      } else if (name === 'space') {     // 宇宙の静けさ：きらーん（ほとんど無音）
        tone(1320, t, 1.2, { gain: 0.04, attack: 0.3 });
        tone(1976, t + 0.15, 1.0, { gain: 0.03, attack: 0.3 });
      } else if (name === 'earthcrack') { // 静けさのあと：ピシピシッ、どおぉん
        for (let i = 0; i < 6; i++) noise(t + i * 0.05, 0.05, { type: 'highpass', f: 2500 + i * 300, q: 0.8, gain: 0.2 });
        tone(36, t + 0.05, 1.6, { gain: 0.5, f2: 22, attack: 0.02 });
        noise(t + 0.05, 1.3, { type: 'lowpass', f: 400, f2: 50, q: 0.7, gain: 0.4 });
      } else if (name === 'earthsplit') { // 地球が割れる：どごおおおん
        tone(30, t, 2.2, { gain: 0.5, f2: 20, attack: 0.02 });
        noise(t, 2.0, { type: 'lowpass', f: 800, f2: 40, q: 0.7, gain: 0.42 });
        noise(t, 0.6, { f: 3000, f2: 200, q: 0.7, gain: 0.22 });
        tone(60, t, 1.6, { type: 'sawtooth', gain: 0.12, f2: 28 });
      } else if (name === 'twinkle') {   // 割れたあとのきらきら
        tone(1568, t, 0.5, { type: 'triangle', gain: 0.06 });
        tone(2093, t + 0.12, 0.5, { type: 'triangle', gain: 0.05 });
      } else if (name === 'crater') {    // どーん
        tone(72, t, 1.1, { gain: 0.5, f2: 26, attack: 0.01 });
        noise(t, 1.2, { type: 'lowpass', f: 1000, f2: 70, q: 0.7, gain: 0.4 });
        noise(t, 0.3, { f: 2500, f2: 400, q: 0.7, gain: 0.2 });
      }
    },
    // ゴング（k：音の高さの倍率。段階が高いほど低く）
    gongAt(t, k) {
      tone(98 * k, t, 1.8, { gain: 0.3, f2: 92 * k, attack: 0.01 });
      tone(196 * k, t, 1.5, { type: 'triangle', gain: 0.14, f2: 190 * k, attack: 0.01 });
      tone(312 * k, t, 1.1, { type: 'sine', gain: 0.08, attack: 0.01 });
      noise(t, 0.12, { f: 1800, q: 0.9, gain: 0.12 });
    },
    // 認定証が出る音：太鼓のどん＋段階が高いほど明るい鈴（破門はゴング、出直しはしょんぼり）
    cert(stage) {
      if (!ac) return; const t = now();
      if (stage >= 7) { this.gongAt(t, 1 - (stage - 7) * 0.1); return; }
      if (stage === 0) return;
      tone(110, t, 0.3, { gain: 0.38, f2: 55 });
      noise(t, 0.05, { f: 1400, q: 0.9, gain: 0.14 });
      const f = 523 * Math.pow(2, stage * 1.5 / 12);
      tone(f, t + 0.12, 0.5, { type: 'triangle', gain: 0.09 });
      tone(f * 1.5, t + 0.2, 0.5, { type: 'triangle', gain: 0.07 });
    },
  };
})();
