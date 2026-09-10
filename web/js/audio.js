/* ============ NEON HORDE — procedural audio (WebAudio, no asset files) ============ */
'use strict';

const Sfx = {
  ctx: null, master: null, sfxBus: null, musBus: null, noise: null,
  ready: false, muted: false,
  _last: Object.create(null),
  _voices: 0,

  init() {
    if (this.ctx) { this.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = this.ctx = new AC();

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 22;
    comp.ratio.value = 9; comp.attack.value = .003; comp.release.value = .22;

    const master = this.master = ctx.createGain();
    master.gain.value = this.muted ? 0 : .85;

    this.sfxBus = ctx.createGain(); this.sfxBus.gain.value = .85;
    this.musBus = ctx.createGain(); this.musBus.gain.value = .42;

    // gentle reverb-ish send using a short convolution built from noise
    const conv = ctx.createConvolver();
    conv.buffer = this._impulse(1.5, 2.6);
    const send = this.revSend = ctx.createGain(); send.gain.value = .18;
    send.connect(conv); conv.connect(comp);

    this.sfxBus.connect(comp); this.musBus.connect(comp);
    this.sfxBus.connect(send);
    comp.connect(master); master.connect(ctx.destination);

    // white-noise buffer
    const len = ctx.sampleRate * 1.2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;

    this.ready = true;
    this.resume();
  },

  _impulse(dur, decay) {
    const ctx = this.ctx, len = (ctx.sampleRate * dur) | 0;
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < len; i++)
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return b;
  },

  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : .85, this.ctx.currentTime, .02);
  },

  /* throttle: returns false if `name` played less than `ms` ago */
  _gate(name, ms) {
    const t = performance.now();
    if (this._last[name] !== undefined && t - this._last[name] < ms) return false;
    this._last[name] = t;
    return true;
  },

  /* ---- primitives ---- */
  tone(o) {
    if (!this.ready || this.muted) return;
    if (this._voices > 26) return;
    const ctx = this.ctx, t = ctx.currentTime + (o.delay || 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.f2 !== undefined) {
      if (o.exp) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f2), t + o.d);
      else osc.frequency.linearRampToValueAtTime(o.f2, t + o.d);
    }
    if (o.detune) osc.detune.value = o.detune;

    const vol = (o.v === undefined ? .3 : o.v);
    const atk = o.atk === undefined ? .004 : o.atk;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(.0002, vol), t + atk);
    g.gain.exponentialRampToValueAtTime(.0001, t + o.d);

    let node = osc;
    if (o.lp) {
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.setValueAtTime(o.lp, t);
      if (o.lp2) f.frequency.exponentialRampToValueAtTime(Math.max(60, o.lp2), t + o.d);
      f.Q.value = o.q || 1;
      node.connect(f); node = f;
    }
    node.connect(g); g.connect(o.bus || this.sfxBus);
    this._voices++;
    osc.onended = () => { this._voices--; };
    osc.start(t); osc.stop(t + o.d + .02);
  },

  noiseHit(o) {
    if (!this.ready || this.muted) return;
    const ctx = this.ctx, t = ctx.currentTime + (o.delay || 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = o.rate || 1;
    const f = ctx.createBiquadFilter();
    f.type = o.ft || 'bandpass';
    f.frequency.setValueAtTime(o.f, t);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(Math.max(40, o.f2), t + o.d);
    f.Q.value = o.q === undefined ? 1.2 : o.q;
    const g = ctx.createGain();
    const vol = o.v === undefined ? .3 : o.v;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(.0001, t + o.d);
    src.connect(f); f.connect(g); g.connect(o.bus || this.sfxBus);
    src.start(t, Math.random() * .4); src.stop(t + o.d + .02);
  },

  /* ================= game sounds ================= */
  shoot(kind) {
    if (!this._gate('sh', 42)) return;
    switch (kind) {
      case 'pistol': this.tone({ f: 880, f2: 340, d: .08, type: 'square', v: .1, exp: 1, lp: 2600 }); break;
      case 'shotgun':
        this.noiseHit({ f: 1700, f2: 300, d: .17, v: .17, q: .7 });
        this.tone({ f: 200, f2: 70, d: .13, type: 'sawtooth', v: .12, exp: 1 }); break;
      case 'laser':
        this.tone({ f: 1500, f2: 2900, d: .18, type: 'sawtooth', v: .09, exp: 1, lp: 4000 });
        this.tone({ f: 750, f2: 1450, d: .18, type: 'square', v: .06, exp: 1 }); break;
      case 'missile':
        this.noiseHit({ f: 900, f2: 2400, d: .2, v: .1, q: .6 }); break;
      case 'bomb':
        this.tone({ f: 300, f2: 620, d: .12, type: 'triangle', v: .13, exp: 1 }); break;
      case 'blade':
        this.noiseHit({ f: 3200, f2: 1100, d: .1, v: .07, q: 3 }); break;
      case 'frost':
        this.tone({ f: 1900, f2: 620, d: .35, type: 'sine', v: .13, exp: 1 });
        this.tone({ f: 2540, f2: 900, d: .3, type: 'sine', v: .07, exp: 1, delay: .03 }); break;
      case 'lightning':
        this.noiseHit({ f: 2600, f2: 480, d: .22, v: .17, q: .8, ft: 'highpass' });
        this.tone({ f: 130, f2: 44, d: .2, type: 'sawtooth', v: .1, exp: 1 }); break;
      default: this.tone({ f: 700, f2: 300, d: .07, type: 'square', v: .09, exp: 1 });
    }
  },

  hit(crit) {
    if (!this._gate('hit', 26)) return;
    this.noiseHit({ f: crit ? 2600 : 1500, f2: crit ? 700 : 480, d: crit ? .1 : .055, v: crit ? .17 : .1, q: 1.4 });
    if (crit) this.tone({ f: 1400, f2: 2600, d: .09, type: 'square', v: .07, exp: 1 });
  },

  kill() {
    if (!this._gate('kill', 34)) return;
    this.noiseHit({ f: 900, f2: 160, d: .13, v: .13, q: .8 });
    this.tone({ f: 300, f2: 90, d: .11, type: 'triangle', v: .08, exp: 1 });
  },

  explode(big) {
    this.noiseHit({ f: big ? 700 : 1100, f2: 60, d: big ? .62 : .32, v: big ? .34 : .2, q: .5, rate: .7 });
    this.tone({ f: big ? 120 : 190, f2: 30, d: big ? .5 : .26, type: 'sawtooth', v: big ? .22 : .12, exp: 1, lp: 900, lp2: 90 });
  },

  hurt() {
    this.tone({ f: 260, f2: 70, d: .26, type: 'sawtooth', v: .22, exp: 1, lp: 1100, lp2: 200 });
    this.noiseHit({ f: 400, f2: 120, d: .2, v: .16, q: .6 });
  },

  pickup() {
    if (!this._gate('pk', 34)) return;
    const b = 1180 + Math.random() * 120;
    this.tone({ f: b, f2: b * 1.5, d: .07, type: 'sine', v: .1, exp: 1 });
  },

  coin() {
    if (!this._gate('co', 40)) return;
    this.tone({ f: 1560, d: .05, type: 'square', v: .07 });
    this.tone({ f: 2340, d: .09, type: 'square', v: .06, delay: .04 });
  },

  heal() {
    [523, 659, 784, 1046].forEach((f, i) =>
      this.tone({ f, d: .3, type: 'sine', v: .11, delay: i * .055 }));
  },

  levelup() {
    [523, 698, 880, 1046, 1318].forEach((f, i) =>
      this.tone({ f, d: .45, type: 'triangle', v: .15, delay: i * .07 }));
    this.tone({ f: 130, f2: 520, d: .5, type: 'sawtooth', v: .12, exp: 1, lp: 2000 });
  },

  select() { this.tone({ f: 1250, f2: 1850, d: .09, type: 'square', v: .1, exp: 1 }); },
  hover() { if (!this._gate('hv', 60)) return; this.tone({ f: 900, d: .035, type: 'sine', v: .05 }); },

  dash() {
    this.noiseHit({ f: 340, f2: 2900, d: .24, v: .13, q: .7 });
    this.tone({ f: 420, f2: 1150, d: .18, type: 'triangle', v: .08, exp: 1 });
  },

  waveStart() {
    [392, 523, 659].forEach((f, i) => this.tone({ f, d: .5, type: 'square', v: .12, delay: i * .1, lp: 2400 }));
  },

  waveClear() {
    [523, 659, 784, 1046, 1318, 1568].forEach((f, i) =>
      this.tone({ f, d: .55, type: 'triangle', v: .14, delay: i * .085 }));
  },

  bossWarn() {
    this.tone({ f: 62, f2: 44, d: 1.5, type: 'sawtooth', v: .3, exp: 1, lp: 420 });
    this.noiseHit({ f: 180, f2: 60, d: 1.4, v: .2, q: .4, rate: .5 });
    for (let i = 0; i < 3; i++)
      this.tone({ f: 220, f2: 165, d: .35, type: 'square', v: .13, exp: 1, delay: .25 + i * .3 });
  },

  bossDie() {
    this.explode(true);
    for (let i = 0; i < 6; i++)
      setTimeout(() => this.explode(Math.random() < .4), i * 130 + Math.random() * 90);
  },

  gameOver() {
    [440, 392, 330, 262, 196].forEach((f, i) =>
      this.tone({ f, d: .85, type: 'sawtooth', v: .16, delay: i * .19, lp: 1400 }));
  },

  chest() {
    [659, 784, 988, 1318, 1568, 2093].forEach((f, i) =>
      this.tone({ f, d: .7, type: 'sine', v: .13, delay: i * .06 }));
  },

  /* ================= procedural music ================= */
  mus: {
    on: false, step: 0, next: 0, timer: null, intensity: 0, bar: 0
  },

  startMusic() {
    if (!this.ready || this.mus.on) return;
    const M = this.mus;
    M.on = true; M.step = 0; M.next = this.ctx.currentTime + .1;
    M.timer = setInterval(() => this._sched(), 25);
  },
  stopMusic() {
    const M = this.mus;
    M.on = false;
    if (M.timer) { clearInterval(M.timer); M.timer = null; }
  },
  setIntensity(v) { this.mus.intensity = clamp(v, 0, 1); },

  _sched() {
    if (!this.ready || !this.mus.on) return;
    const M = this.mus, ctx = this.ctx;
    const spb = 60 / 138 / 4;          // 16th note
    while (M.next < ctx.currentTime + .12) {
      this._playStep(M.step, M.next, spb);
      M.next += spb;
      M.step++;
      if (M.step % 16 === 0) M.bar++;
    }
  },

  _playStep(step, t, spb) {
    if (this.muted) return;
    const s = step % 16;
    const bar = Math.floor(step / 16) % 8;
    const I = this.mus.intensity;      // 0..1 escalates with wave
    const bus = this.musBus;
    const ctx = this.ctx;

    // ---- root note progression (A minor-ish) ----
    const roots = [55, 55, 73.42, 65.41, 55, 55, 82.41, 65.41]; // A1 A1 D2 C2 ...
    const root = roots[bar];

    // kick
    if (s === 0 || s === 6 || s === 10 || (I > .35 && s === 14)) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(130, t);
      o.frequency.exponentialRampToValueAtTime(40, t + .11);
      g.gain.setValueAtTime(.55, t);
      g.gain.exponentialRampToValueAtTime(.001, t + .18);
      o.connect(g); g.connect(bus); o.start(t); o.stop(t + .2);
    }
    // snare / clap
    if (s === 4 || s === 12) {
      const src = ctx.createBufferSource(); src.buffer = this.noise;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = .8;
      const g = ctx.createGain();
      g.gain.setValueAtTime(.26, t); g.gain.exponentialRampToValueAtTime(.001, t + .14);
      src.connect(f); f.connect(g); g.connect(bus);
      src.start(t, Math.random() * .3); src.stop(t + .16);
    }
    // hats
    if (I > .12 && (s % 2 === 1)) {
      const src = ctx.createBufferSource(); src.buffer = this.noise;
      src.playbackRate.value = 2.4;
      const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7200;
      const g = ctx.createGain();
      const v = (s % 4 === 3 ? .1 : .055) * (.6 + I * .6);
      g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + .05);
      src.connect(f); f.connect(g); g.connect(bus);
      src.start(t, Math.random() * .3); src.stop(t + .06);
    }
    // bass
    const bassPat = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0];
    if (bassPat[s]) {
      const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.value = root;
      f.type = 'lowpass'; f.Q.value = 6;
      f.frequency.setValueAtTime(300 + I * 700, t);
      f.frequency.exponentialRampToValueAtTime(140, t + .22);
      g.gain.setValueAtTime(.0001, t);
      g.gain.exponentialRampToValueAtTime(.3, t + .01);
      g.gain.exponentialRampToValueAtTime(.001, t + .24);
      o.connect(f); f.connect(g); g.connect(bus);
      o.start(t); o.stop(t + .26);
    }
    // arp (kicks in with intensity)
    if (I > .22 && s % 2 === 0) {
      const scale = [0, 3, 5, 7, 10, 12, 15, 12, 10, 7, 5, 3];
      const semi = scale[(step / 2 | 0) % scale.length];
      const f0 = root * 4 * Math.pow(2, semi / 12);
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'square'; o.frequency.value = f0;
      const v = .05 + I * .07;
      g.gain.setValueAtTime(.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + .006);
      g.gain.exponentialRampToValueAtTime(.0001, t + .16);
      o.connect(g); g.connect(bus); o.start(t); o.stop(t + .18);
    }
    // pad swell every bar
    if (s === 0 && I > .05) {
      [0, 3, 7].forEach((semi, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
        o.type = 'sawtooth';
        o.frequency.value = root * 2 * Math.pow(2, semi / 12);
        o.detune.value = (i - 1) * 7;
        f.type = 'lowpass'; f.frequency.value = 700 + I * 900;
        const d = spb * 16;
        g.gain.setValueAtTime(.0001, t);
        g.gain.exponentialRampToValueAtTime(.035 + I * .03, t + d * .35);
        g.gain.exponentialRampToValueAtTime(.0001, t + d);
        o.connect(f); f.connect(g); g.connect(bus);
        o.start(t); o.stop(t + d + .05);
      });
    }
  }
};
