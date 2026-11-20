// ===== 効果音（WebAudio で合成。音声ファイルなし・BGMなし。太鼓の連打が音楽の代わり）=====
const Snd = (() => {
  let ac = null, master = null, noiseBuf = null;
  const recent = [];   // 直近に鳴らした太鼓の時刻（重なりすぎの間引きに使う）

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

  function tone(f, t0, dur, o) {
    if (!ac) return;
    o = o || {};
    const osc = ac.createOscillator(), g = ac.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(f, t0);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t0 + dur);
    const a = o.attack || 0.004, v = o.gain == null ? 0.3 : o.gain;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(master);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }
  function noise(t0, dur, o) {
    if (!ac) return;
    const src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const fl = ac.createBiquadFilter(); fl.type = o.type || 'bandpass';
    fl.frequency.setValueAtTime(o.f, t0); fl.Q.value = o.q || 1;
    if (o.f2) fl.frequency.exponentialRampToValueAtTime(o.f2, t0 + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(Math.max(0.0001, o.gain == null ? 0.3 : o.gain), t0 + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(fl); fl.connect(g); g.connect(master);
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
      const k = Math.min(count, 70) / 70;
      const f = 78 + k * 150, v = 0.2 + k * 0.22;
      tone(f * 1.7, t, 0.13, { gain: v, f2: f });
      tone(f * 0.5, t, 0.2, { gain: v * 0.6, f2: f * 0.42 });
      noise(t, 0.04, { f: 1500 + k * 900, q: 0.9, gain: 0.08 + k * 0.08 });
    },
    // 10 回ごとのご褒美の音
    tier(tier) {
      if (!ac) return; const t = now();
      const f = 440 * Math.pow(2, Math.min(tier, 7) * 2 / 12);
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
  };
})();
