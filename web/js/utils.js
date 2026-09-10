/* ============ NEON HORDE — utils ============ */
'use strict';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[(Math.random() * arr.length) | 0];
const dist2 = (ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay; return dx * dx + dy * dy; };
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
const angleTo = (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax);
const approach = (v, t, d) => v < t ? Math.min(v + d, t) : Math.max(v - d, t);
const sign = v => v < 0 ? -1 : 1;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const easeIn = t => t * t * t;

/** shuffle in place */
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

/** weighted pick: items = [{w:number,...}] */
function wpick(items) {
  let total = 0;
  for (const it of items) total += it.w;
  let r = Math.random() * total;
  for (const it of items) { r -= it.w; if (r <= 0) return it; }
  return items[items.length - 1];
}

/** Format seconds -> m:ss */
function fmtTime(s) {
  s = Math.max(0, Math.ceil(s));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

function fmtNum(n) {
  n = Math.round(n);
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 10000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
}

/* ---------- color helpers ---------- */
function hexToRgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgba(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
function mixHex(h1, h2, t) {
  const a = hexToRgb(h1), b = hexToRgb(h2);
  const c = a.map((v, i) => Math.round(lerp(v, b[i], t)));
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
}

/* ---------- object pool ---------- */
class Pool {
  constructor(factory, reset) {
    this.factory = factory; this.reset = reset;
    this.free = []; this.active = [];
  }
  spawn(...args) {
    const o = this.free.pop() || this.factory();
    this.reset(o, ...args);
    o.dead = false;
    this.active.push(o);
    return o;
  }
  /** call each frame after updating; removes dead */
  sweep() {
    const a = this.active;
    let n = 0;
    for (let i = 0; i < a.length; i++) {
      const o = a[i];
      if (o.dead) { this.free.push(o); }
      else a[n++] = o;
    }
    a.length = n;
  }
  clear() {
    for (const o of this.active) this.free.push(o);
    this.active.length = 0;
  }
  get count() { return this.active.length; }
}

/* ---------- spatial hash grid (broad-phase) ---------- */
class Grid {
  constructor(cell = 96) { this.cell = cell; this.map = new Map(); }
  clear() { this.map.clear(); }
  _key(cx, cy) { return cx * 46341 + cy; }
  insert(o) {
    const c = this.cell;
    const cx = Math.floor(o.x / c), cy = Math.floor(o.y / c);
    const k = this._key(cx, cy);
    let b = this.map.get(k);
    if (!b) { b = []; this.map.set(k, b); }
    b.push(o);
  }
  /** collect entities within radius r of (x,y) into out array */
  query(x, y, r, out) {
    out.length = 0;
    const c = this.cell;
    const x0 = Math.floor((x - r) / c), x1 = Math.floor((x + r) / c);
    const y0 = Math.floor((y - r) / c), y1 = Math.floor((y + r) / c);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const b = this.map.get(this._key(cx, cy));
        if (b) for (let i = 0; i < b.length; i++) out.push(b[i]);
      }
    }
    return out;
  }
}

/* ---------- storage ---------- */
const Save = {
  key: 'neonhorde.v1',
  data: { best: 0, bestKills: 0, muted: false, runs: 0, totalKills: 0 },
  load() {
    try {
      const raw = localStorage.getItem(this.key);
      if (raw) Object.assign(this.data, JSON.parse(raw));
    } catch (e) { /* private mode */ }
    return this.data;
  },
  save() {
    try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { }
  }
};
