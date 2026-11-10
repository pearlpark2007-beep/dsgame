// sound.js — the cinematics' sound, made on the spot with the Web Audio API (no sound files):
// war drums, booms, a metal clang, a splash, a whoosh, a rattling chain.
// Browsers only allow sound after the player has clicked or pressed something; before that,
// every call quietly does nothing.
export class Sound {
  constructor() { this.muted = false; this.volume = 0.5; }
  get ctx() {
    try {
      this._ctx ||= new (window.AudioContext || window.webkitAudioContext)();
      if (this._ctx.state === "suspended") this._ctx.resume();
      if (!this._out) { this._out = this._ctx.createGain(); this._out.gain.value = this.volume; this._out.connect(this._ctx.destination); }
      return this._ctx;
    } catch { return null; }
  }
  _noise(seconds) {
    const A = this.ctx, b = A.createBuffer(1, Math.ceil(A.sampleRate * seconds), A.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = A.createBufferSource(); s.buffer = b; return s;
  }
  _env(g, t, peak, attack, decay) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay); }

  // a deep drum hit (a war drum, or a heavy impact when big)
  boom({ freq = 70, to = 38, seconds = 0.6, level = 0.9, at = 0 } = {}) {
    const A = this.ctx; if (!A || this.muted) return;
    const t = A.currentTime + at, o = A.createOscillator(), g = A.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(to, t + seconds);
    this._env(g, t, level, 0.005, seconds); o.connect(g).connect(this._out); o.start(t); o.stop(t + seconds + 0.05);
    // the skin: a short burst of filtered noise on top
    const n = this._noise(0.12), f = A.createBiquadFilter(), gn = A.createGain();
    f.type = "lowpass"; f.frequency.value = 900; this._env(gn, t, level * 0.35, 0.002, 0.1);
    n.connect(f).connect(gn).connect(this._out); n.start(t);
  }
  // a crash: rocks, wood, the tower bursting
  crash({ seconds = 1.2, level = 0.8 } = {}) {
    const A = this.ctx; if (!A || this.muted) return;
    const t = A.currentTime, n = this._noise(seconds), f = A.createBiquadFilter(), g = A.createGain();
    f.type = "lowpass"; f.frequency.setValueAtTime(2400, t); f.frequency.exponentialRampToValueAtTime(200, t + seconds);
    this._env(g, t, level, 0.005, seconds); n.connect(f).connect(g).connect(this._out); n.start(t);
    this.boom({ freq: 60, to: 28, seconds: 1.0, level: 1 });
  }
  // bronze on iron: a bright ringing clang
  clang({ level = 0.5 } = {}) {
    const A = this.ctx; if (!A || this.muted) return;
    const t = A.currentTime;
    for (const [f, l] of [[523, 1], [1187, 0.6], [1764, 0.45], [2633, 0.3]]) {
      const o = A.createOscillator(), g = A.createGain(); o.type = "square"; o.frequency.value = f * (1 + (Math.random() - 0.5) * 0.01);
      this._env(g, t, level * l * 0.25, 0.002, 1.6); o.connect(g).connect(this._out); o.start(t); o.stop(t + 1.7);
    }
    this.crash({ seconds: 0.4, level: 0.4 });
  }
  // into the sea
  splash({ level = 0.6 } = {}) {
    const A = this.ctx; if (!A || this.muted) return;
    const t = A.currentTime, n = this._noise(1.4), f = A.createBiquadFilter(), g = A.createGain();
    f.type = "bandpass"; f.frequency.setValueAtTime(1800, t); f.frequency.exponentialRampToValueAtTime(400, t + 1.2); f.Q.value = 0.7;
    this._env(g, t, level, 0.01, 1.3); n.connect(f).connect(g).connect(this._out); n.start(t);
    this.boom({ freq: 90, to: 40, seconds: 0.4, level: 0.5 });
  }
  // air rushing past (the launch, the dive)
  whoosh({ seconds = 1.2, level = 0.4 } = {}) {
    const A = this.ctx; if (!A || this.muted) return;
    const t = A.currentTime, n = this._noise(seconds), f = A.createBiquadFilter(), g = A.createGain();
    f.type = "bandpass"; f.Q.value = 1.2; f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(2200, t + seconds * 0.6); f.frequency.exponentialRampToValueAtTime(500, t + seconds);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(level, t + seconds * 0.5); g.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
    n.connect(f).connect(g).connect(this._out); n.start(t);
  }
  // a chain running over a drum: fast metal ticks
  rattle({ seconds = 1.6, level = 0.35 } = {}) {
    const A = this.ctx; if (!A || this.muted) return;
    const t = A.currentTime;
    for (let k = 0; k < seconds * 18; k++) {
      const n = this._noise(0.03), f = A.createBiquadFilter(), g = A.createGain();
      f.type = "highpass"; f.frequency.value = 2500; this._env(g, t + k / 18, level * (0.6 + Math.random() * 0.4), 0.001, 0.03);
      n.connect(f).connect(g).connect(this._out); n.start(t + k / 18);
    }
  }
  // war drums: a heavy, steady beat that builds (call with false to stop)
  drums(on, { bpm = 92 } = {}) {
    clearInterval(this._drum); this._drum = null;
    if (!on) return;
    let k = 0;
    const beat = 60 / bpm;
    this._drum = setInterval(() => {
      if (this.muted) return;
      const accent = k % 4 === 0;
      this.boom({ freq: accent ? 80 : 65, to: 34, seconds: 0.45, level: accent ? 0.75 : 0.45 });
      if (k % 8 === 7) this.boom({ freq: 70, to: 34, seconds: 0.3, level: 0.4, at: beat / 2 });
      k++;
    }, beat * 1000);
  }
  // ---- Tarantino's tools: silence before the hit, a heartbeat that survives the silence,
  // a low drone under the build-up, and a lonely whistle (an original phrase, nobody's tune)
  _side() { const A = this.ctx; if (!A) return null; if (!this._heartOut) { this._heartOut = A.createGain(); this._heartOut.gain.value = this.volume; this._heartOut.connect(A.destination); } return this._heartOut; }
  heart({ level = 0.8 } = {}) {
    const A = this.ctx, out = this._side(); if (!A || this.muted) return;
    for (const [d, f, l] of [[0, 62, 1], [0.22, 56, 0.8]]) {
      const t = A.currentTime + d, o = A.createOscillator(), g = A.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(36, t + 0.18);
      this._env(g, t, level * l, 0.004, 0.2); o.connect(g).connect(out); o.start(t); o.stop(t + 0.3);
    }
  }
  heartbeat(on, { bpm = 70 } = {}) { clearInterval(this._hb); this._hb = null; if (on) { this.heart(); this._hb = setInterval(() => this.heart(), 60000 / bpm); } }
  silence(seconds = 0.35) { const A = this.ctx; if (!A) return; const t = A.currentTime, g = this._out.gain; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0.0001, t + seconds); clearInterval(this._drum); this._drum = null; }
  restore(seconds = 0.03) { const A = this.ctx; if (!A) return; const t = A.currentTime, g = this._out.gain; g.cancelScheduledValues(t); g.setValueAtTime(Math.max(g.value, 0.0001), t); g.linearRampToValueAtTime(this.volume, t + seconds); }
  drone({ level = 0.16 } = {}) {
    const A = this.ctx; if (!A || this.muted) return () => {};
    const t = A.currentTime, g = A.createGain(), f = A.createBiquadFilter();
    f.type = "lowpass"; f.frequency.value = 360;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(level, t + 2.5);
    const os = [55, 55.35, 82.4].map(fr => { const o = A.createOscillator(); o.type = "sawtooth"; o.frequency.value = fr; o.connect(f); o.start(t); return o; });
    f.connect(g).connect(this._out);
    return (fade = 1.2) => { const e = A.currentTime; g.gain.cancelScheduledValues(e); g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), e); g.gain.exponentialRampToValueAtTime(0.0001, e + fade); os.forEach(o => o.stop(e + fade + 0.1)); };
  }
  whistle({ level = 0.1 } = {}) {
    const A = this.ctx; if (!A || this.muted) return;
    for (const [d, f, l] of [[0, 988, 0.5], [0.55, 1175, 0.35], [0.95, 880, 0.9], [2.0, 784, 1.3]]) {
      const t = A.currentTime + d, o = A.createOscillator(), g = A.createGain(), vib = A.createOscillator(), vg = A.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * 0.985, t + l);
      vib.frequency.value = 5.5; vg.gain.value = f * 0.006; vib.connect(vg).connect(o.frequency); vib.start(t); vib.stop(t + l + 0.1);
      this._env(g, t, level, 0.06, l); o.connect(g).connect(this._out); o.start(t); o.stop(t + l + 0.1);
    }
  }
  // a giant's roar: a low growl with breath in it
  roar({ seconds = 2.2, level = 0.5 } = {}) {
    const A = this.ctx; if (!A || this.muted) return;
    const t = A.currentTime;
    for (const [f0, f1, l] of [[75, 52, 0.5], [112, 78, 0.25]]) {
      const o = A.createOscillator(), g = A.createGain(), fl = A.createBiquadFilter();
      o.type = "sawtooth"; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + seconds);
      fl.type = "lowpass"; fl.frequency.value = 600; this._env(g, t, level * l, 0.15, seconds);
      o.connect(fl).connect(g).connect(this._out); o.start(t); o.stop(t + seconds + 0.2);
    }
    const n = this._noise(seconds), fn = A.createBiquadFilter(), gn = A.createGain();
    fn.type = "lowpass"; fn.frequency.setValueAtTime(800, t); fn.frequency.exponentialRampToValueAtTime(300, t + seconds);
    this._env(gn, t, level * 0.5, 0.2, seconds); n.connect(fn).connect(gn).connect(this._out); n.start(t);
  }
}
export const sound = new Sound();
