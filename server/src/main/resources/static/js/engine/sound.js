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
  // ---------- one volume and one mute for the whole game (the shared sound control sets these)
  setVolume(v) { this.volume = Math.max(0, Math.min(1, v)); if (this._out && this._ctx) this._out.gain.setTargetAtTime(this.volume, this._ctx.currentTime, 0.05); }
  setMuted(m) {
    this.muted = !!m;
    if (this.muted) { this.sea(false); this._stopAmb(); }
    else if (this._ambKind) this.ambience(this._ambKind);
  }
  // ---------- one small sound for one data-structure operation (never more than one every 120 ms, so a
  // fast-forwarded run doesn't turn into noise). kind: thump (a crate set down, a value written),
  // creak (a crate lifted), tick (a value read, a pointer moved), ticket (a ticket printed: enqueue),
  // bell (the counter bell: dequeue), buzz (full / empty: refused)
  op(kind) {
    const A = this.ctx; if (!A || this.muted) return;
    const now = performance.now(); if (now - (this._opAt || 0) < 120) return; this._opAt = now;
    const t = A.currentTime, out = this._out;
    const tone = (type, f0, f1, level, dur, at = 0) => { const o = A.createOscillator(), g = A.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t + at); o.frequency.exponentialRampToValueAtTime(f1, t + at + dur); this._env(g, t + at, level, 0.004, dur); o.connect(g).connect(out); o.start(t + at); o.stop(t + at + dur + 0.05); };
    const hiss = (type, freq, q, level, dur) => { const n = this._noise(dur + 0.05), f = A.createBiquadFilter(), g = A.createGain(); f.type = type; f.frequency.value = freq; f.Q.value = q; this._env(g, t, level, 0.004, dur); n.connect(f).connect(g).connect(out); n.start(t); };
    if (kind === "thump") { tone("sine", 120, 60, 0.28, 0.18); hiss("lowpass", 700, 0.7, 0.08, 0.08); }
    else if (kind === "creak") { hiss("bandpass", 650, 8, 0.12, 0.22); }
    else if (kind === "tick") { tone("sine", 1300, 700, 0.09, 0.05); }
    else if (kind === "ticket") { tone("square", 1800, 1600, 0.035, 0.03); tone("square", 1800, 1600, 0.035, 0.03, 0.06); }
    else if (kind === "bell") { tone("triangle", 1568, 1560, 0.12, 0.9); tone("sine", 3136, 3120, 0.04, 0.5); }
    else if (kind === "buzz") { tone("sawtooth", 110, 104, 0.08, 0.35); }
  }
  // ---------- each place's ambience: quiet, looping, made from filtered noise and tones; one at a time.
  // kind: "title" (sea and wind) | "harbour" (rain and gusts) | "cave" (fire, drips, a low rumble) |
  //       "underworld" (the fluorescent hum, the odd ticket click) | null (stop)
  ambience(kind) {
    this._ambKind = kind || null;
    this._stopAmb();
    if (!kind || this.muted) return;
    if (kind === "circe") { this.sea(true); this._amb = { sea: true }; return; }   // Aeaea: the sea (its own other sounds play on events)
    const A = this.ctx; if (!A) return;
    const bus = A.createGain(); bus.gain.value = 0.0001; bus.connect(this._out);
    bus.gain.exponentialRampToValueAtTime(1, A.currentTime + 2.5);
    const nodes = [], timers = [];
    const loopNoise = (type, freq, q, level) => {
      const n = this._noise(4); n.loop = true;
      const f = A.createBiquadFilter(); f.type = type; f.frequency.value = freq; if (q) f.Q.value = q;
      const g = A.createGain(); g.gain.value = level;
      n.connect(f).connect(g).connect(bus); n.start(); nodes.push(n);
      return { f, g };
    };
    const swell = (param, depth, rate) => { const l = A.createOscillator(), lg = A.createGain(); l.frequency.value = rate; lg.gain.value = depth; l.connect(lg).connect(param); l.start(); nodes.push(l); };
    const every = (ms, jitter, fn) => { const tick = () => { if (!this.muted) fn(); timers.push(setTimeout(tick, ms + Math.random() * jitter)); }; timers.push(setTimeout(tick, ms * Math.random())); };
    const blip = (freq, to, level, dur, type = "sine") => {
      const t = A.currentTime, o = A.createOscillator(), g = A.createGain(); o.type = type;
      o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(to, t + dur);
      this._env(g, t, level, 0.003, dur); o.connect(g).connect(bus); o.start(t); o.stop(t + dur + 0.05);
    };
    if (kind === "title" || kind === "harbour") {
      const sea = loopNoise("lowpass", 480, 0, kind === "title" ? 0.05 : 0.035); swell(sea.g.gain, 0.025, 0.09);   // the sea, breathing
      const wind = loopNoise("bandpass", 700, 0.6, 0.018); swell(wind.f.frequency, 260, 0.05);                      // wind, rising and falling
    }
    if (kind === "harbour") {
      loopNoise("highpass", 3200, 0, 0.03);                                                                           // rain
      every(14000, 16000, () => this.boom({ freq: 46, to: 26, seconds: 2.2, level: 0.18 }));                         // distant thunder
    }
    if (kind === "cave") {
      const fire = loopNoise("bandpass", 260, 0.8, 0.03); swell(fire.g.gain, 0.012, 0.7);                             // the hearth's roar
      every(180, 420, () => { if (Math.random() < 0.55) blip(2200 + Math.random() * 1800, 900, 0.02, 0.025, "square"); });   // crackles
      every(2600, 3400, () => blip(1500 + Math.random() * 500, 700, 0.05, 0.14));                                     // water dripping into the pool
      const low = A.createOscillator(), lg = A.createGain(); low.frequency.value = 38; lg.gain.value = 0.025; low.connect(lg).connect(bus); low.start(); nodes.push(low);   // the rock itself
    }
    if (kind === "underworld") {
      [[50, 0.02], [100, 0.012], [150, 0.006], [300, 0.003]].forEach(([fq, lv]) => { const o = A.createOscillator(), g = A.createGain(); o.type = "sawtooth"; o.frequency.value = fq; g.gain.value = lv; o.connect(g).connect(bus); o.start(); nodes.push(o); });   // the tubes' hum
      loopNoise("lowpass", 900, 0, 0.008);                                                                            // the room
      every(7000, 9000, () => blip(1800, 1400, 0.03, 0.04, "square"));                                                // somewhere, a ticket machine
    }
    this._amb = { bus, nodes, timers };
    if (!this._ambHooked) { this._ambHooked = true; addEventListener("pagehide", () => this._stopAmb(0)); }
  }
  _stopAmb(fade = 0.8) {
    const a = this._amb; if (!a) return; this._amb = null;
    if (a.sea) { this.sea(false); return; }
    a.timers.forEach(clearTimeout);
    const A = this._ctx; if (!A) return;
    const t = A.currentTime;
    a.bus.gain.cancelScheduledValues(t); a.bus.gain.setValueAtTime(Math.max(a.bus.gain.value, 0.0001), t); a.bus.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.02, fade));
    a.nodes.forEach(n => { try { n.stop(t + fade + 0.05); } catch { /* already stopped */ } });
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
  // ---------- Aeaea's small sounds (all made here, no files)
  // the sea: slow swells of filtered noise, very quiet. sea(true) starts it, sea(false) fades it out
  sea(on, { level = 0.05 } = {}) {
    const A = this.ctx; if (!A) return;
    if (!on) { if (this._sea) { const e = A.currentTime, g = this._sea.g; g.gain.cancelScheduledValues(e); g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), e); g.gain.exponentialRampToValueAtTime(0.0001, e + 1.5); this._sea.n.stop(e + 1.6); this._sea.l.stop(e + 1.6); this._sea = null; } return; }
    if (this._sea || this.muted) return;
    const n = this._noise(4); n.loop = true;
    const f = A.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 520;
    const g = A.createGain(); g.gain.value = 0.0001; g.gain.exponentialRampToValueAtTime(level, A.currentTime + 3);
    const l = A.createOscillator(), lg = A.createGain(); l.frequency.value = 0.11; lg.gain.value = level * 0.6; l.connect(lg).connect(g.gain);   // the swell
    n.connect(f).connect(g).connect(this._out); n.start(); l.start();
    this._sea = { n, l, g };
  }
  // the loudspeaker: a two-note chime, then a short crackle
  chime({ level = 0.18 } = {}) {
    const A = this.ctx; if (!A || this.muted) return;
    const t = A.currentTime;
    [[784, 0], [587, 0.22]].forEach(([fr, at]) => { const o = A.createOscillator(), g = A.createGain(); o.type = "triangle"; o.frequency.value = fr; this._env(g, t + at, level, 0.01, 0.5); o.connect(g).connect(this._out); o.start(t + at); o.stop(t + at + 0.6); });
    const n = this._noise(0.25), f = A.createBiquadFilter(), g = A.createGain(); f.type = "bandpass"; f.frequency.value = 2400; f.Q.value = 0.8;
    this._env(g, t + 0.75, level * 0.35, 0.005, 0.2); n.connect(f).connect(g).connect(this._out); n.start(t + 0.75);
  }
  // a rope pulled tight: a short creak, noise through a falling resonance
  rope({ level = 0.22 } = {}) {
    const A = this.ctx; if (!A || this.muted) return;
    const t = A.currentTime, n = this._noise(0.3), f = A.createBiquadFilter(), g = A.createGain();
    f.type = "bandpass"; f.Q.value = 9; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(320, t + 0.25);
    this._env(g, t, level, 0.01, 0.24); n.connect(f).connect(g).connect(this._out); n.start(t);
  }
  // a soft wooden tick: a pointer moves on
  tick({ level = 0.12 } = {}) {
    const A = this.ctx; if (!A || this.muted) return;
    const t = A.currentTime, o = A.createOscillator(), g = A.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(1300, t); o.frequency.exponentialRampToValueAtTime(700, t + 0.05);
    this._env(g, t, level, 0.002, 0.06); o.connect(g).connect(this._out); o.start(t); o.stop(t + 0.1);
  }
  // a warm chord. notes: how many voices (one is added per man in the finale); up = rising (success) or one low note (failure)
  chord({ notes = 3, up = true, level = 0.12, seconds = 1.6 } = {}) {
    const A = this.ctx; if (!A || this.muted) return;
    const t = A.currentTime, scale = [220, 277.2, 329.6, 440, 554.4, 659.3, 880];
    const fr = up ? scale.slice(0, Math.max(1, Math.min(notes, scale.length))) : [110];
    fr.forEach((f0, i) => { const o = A.createOscillator(), g = A.createGain(); o.type = "triangle"; o.frequency.value = f0; this._env(g, t + i * 0.04, level / Math.sqrt(fr.length), 0.08, seconds); o.connect(g).connect(this._out); o.start(t + i * 0.04); o.stop(t + seconds + 0.3); });
  }
  // a low drone that rises one step each time step() is called (the banquet's rope turning); stop() fades it
  riser({ level = 0.07 } = {}) {
    const A = this.ctx; if (!A || this.muted) return { step() {}, stop() {} };
    const g = A.createGain(), f = A.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 500;
    g.gain.setValueAtTime(0.0001, A.currentTime); g.gain.exponentialRampToValueAtTime(level, A.currentTime + 1.5);
    const os = [0, 7].map(semi => { const o = A.createOscillator(); o.type = "sawtooth"; o.frequency.value = 55 * Math.pow(2, semi / 12); o.connect(f); o.start(); return o; });
    f.connect(g).connect(this._out);
    let n = 0;
    return {
      step: () => { n++; const e = A.currentTime; os.forEach((o, i) => o.frequency.setTargetAtTime(55 * Math.pow(2, (n * 2 + i * 7) / 12), e, 0.15)); },
      stop: (fade = 0.4) => { const e = A.currentTime; g.gain.cancelScheduledValues(e); g.gain.setValueAtTime(Math.max(g.gain.value, 0.0001), e); g.gain.exponentialRampToValueAtTime(0.0001, e + fade); os.forEach(o => o.stop(e + fade + 0.1)); }
    };
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
