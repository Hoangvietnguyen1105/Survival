/* ============ NEON HORDE — procedural art, particles, fx ============ */
'use strict';

/* ---------------- baking helper ---------------- */
function bake(size, drawFn, glow, glowColor) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.translate(size / 2, size / 2);
  g.lineJoin = 'round'; g.lineCap = 'round';
  if (glow) { g.shadowBlur = glow; g.shadowColor = glowColor; }
  drawFn(g, size / 2);
  return c;
}
function poly(g, n, r, rot = -Math.PI / 2) {
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const a = rot + i / n * TAU;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.closePath();
}
function star(g, n, ro, ri, rot = -Math.PI / 2) {
  g.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = rot + i / (n * 2) * TAU;
    const r = i % 2 ? ri : ro;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    i ? g.lineTo(x, y) : g.moveTo(x, y);
  }
  g.closePath();
}
/** neon body: dark fill + bright stroke + inner core */
function neon(g, color, lw = 3, fill = 'rgba(8,10,20,.85)') {
  g.fillStyle = fill; g.fill();
  g.strokeStyle = color; g.lineWidth = lw; g.stroke();
}

/* ---------------- Art: lazy sprite cache ---------------- */
const Art = {
  cache: Object.create(null),
  get(key) {
    let s = this.cache[key];
    if (!s) { s = this.cache[key] = (this.build[key] || this.build.unknown)(key); }
    return s;
  },

  /**
   * Nướng TRƯỚC toàn bộ sprite ngay khi vào menu.
   * Nếu để nướng lười giữa trận, lần đầu gặp trùm / vũ khí mới sẽ đứng hình
   * cả trăm mili-giây vì phải vẽ + làm mờ quầng sáng ngay lúc đó.
   * Chia nhỏ theo từng khung hình để menu không bị treo.
   */
  warmAll(done) {
    const keys = Object.keys(this.build).filter(k => k !== 'unknown');
    let i = 0;
    const step = () => {
      const t0 = performance.now();
      while (i < keys.length && performance.now() - t0 < 8) {
        const k = keys[i++];
        this.get(k);
        if (k.startsWith('e_') || k.startsWith('ch_')) flashed(k);   // bản chớp trắng khi trúng đòn
      }
      if (i < keys.length) requestAnimationFrame(step);
      else if (done) done();
    };
    step();
  },

  /** Nướng nốt phần còn thiếu NGAY LẬP TỨC — gọi trước khi vào trận cho chắc. */
  warmSync() {
    for (const k in this.build) {
      if (k === 'unknown') continue;
      this.get(k);
      if (k.startsWith('e_') || k.startsWith('ch_')) flashed(k);
    }
  },
  build: {
    unknown: () => bake(32, (g, r) => { poly(g, 4, r * .6); neon(g, '#fff'); }, 10, '#fff'),

    /* ============ CHARACTERS ============ */
    ch_guard: () => bake(72, (g, r) => {
      const R = r * .62;
      poly(g, 6, R, 0); neon(g, '#ff8a3c', 4, 'rgba(40,16,6,.9)');
      poly(g, 6, R * .55, 0); g.fillStyle = 'rgba(255,138,60,.35)'; g.fill();
      g.strokeStyle = '#ffd9a8'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(0, -R * .5); g.lineTo(0, R * .5); g.stroke();
      g.beginPath(); g.moveTo(-R * .38, 0); g.lineTo(R * .38, 0); g.stroke();
    }, 16, '#ff8a3c'),

    ch_ranger: () => bake(72, (g, r) => {
      const R = r * .64;
      g.beginPath();
      g.moveTo(0, -R); g.lineTo(R * .8, R * .62); g.lineTo(0, R * .3); g.lineTo(-R * .8, R * .62);
      g.closePath(); neon(g, '#25f4ee', 4, 'rgba(4,28,32,.9)');
      g.fillStyle = 'rgba(37,244,238,.5)';
      g.beginPath(); g.arc(0, -R * .18, R * .2, 0, TAU); g.fill();
    }, 16, '#25f4ee'),

    ch_mage: () => bake(72, (g, r) => {
      const R = r * .6;
      poly(g, 4, R, -Math.PI / 2); neon(g, '#9d6bff', 4, 'rgba(20,10,40,.9)');
      g.fillStyle = '#d9c4ff';
      g.beginPath(); g.arc(0, 0, R * .28, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(157,107,255,.7)'; g.lineWidth = 2;
      g.beginPath(); g.arc(0, 0, R * .46, .4, 2.4); g.stroke();
      g.beginPath(); g.arc(0, 0, R * .46, .4 + Math.PI, 2.4 + Math.PI); g.stroke();
    }, 18, '#9d6bff'),

    ch_assassin: () => bake(72, (g, r) => {
      const R = r * .62;
      star(g, 4, R, R * .3, -Math.PI / 2); neon(g, '#ff2e88', 3.5, 'rgba(36,4,20,.9)');
      g.fillStyle = 'rgba(255,46,136,.55)';
      g.beginPath(); g.arc(0, 0, R * .2, 0, TAU); g.fill();
    }, 16, '#ff2e88'),

    ch_engineer: () => bake(72, (g, r) => {
      const R = r * .58;
      poly(g, 8, R, Math.PI / 8); neon(g, '#b6ff3a', 4, 'rgba(18,30,4,.9)');
      g.strokeStyle = '#e6ffb0'; g.lineWidth = 2.5;
      g.beginPath(); g.arc(0, 0, R * .42, 0, TAU); g.stroke();
      g.fillStyle = '#b6ff3a';
      for (let i = 0; i < 4; i++) {
        const a = i / 4 * TAU + .4;
        g.beginPath(); g.arc(Math.cos(a) * R * .42, Math.sin(a) * R * .42, 2.6, 0, TAU); g.fill();
      }
    }, 16, '#b6ff3a'),

    /* ============ ENEMIES ============ */
    e_grunt: () => bake(48, (g, r) => {
      poly(g, 3, r * .62); neon(g, '#ff4d5e', 3, 'rgba(34,6,10,.9)');
      g.fillStyle = '#ffb3bb'; g.beginPath(); g.arc(0, r * .08, 3, 0, TAU); g.fill();
    }, 12, '#ff4d5e'),

    e_swarm: () => bake(34, (g, r) => {
      poly(g, 4, r * .55); neon(g, '#ffa62e', 2.4, 'rgba(38,20,2,.9)');
    }, 9, '#ffa62e'),

    e_tank: () => bake(76, (g, r) => {
      poly(g, 6, r * .66, 0); neon(g, '#8f5bff', 5, 'rgba(18,8,40,.92)');
      poly(g, 6, r * .42, 0); g.strokeStyle = 'rgba(200,170,255,.6)'; g.lineWidth = 2.5; g.stroke();
      g.fillStyle = '#e0d2ff'; g.beginPath(); g.arc(0, 0, r * .14, 0, TAU); g.fill();
    }, 16, '#8f5bff'),

    e_shooter: () => bake(50, (g, r) => {
      poly(g, 4, r * .58, 0); neon(g, '#3ce0ff', 3, 'rgba(4,26,34,.9)');
      g.fillStyle = '#bff2ff';
      g.fillRect(-r * .06, -r * .34, r * .12, r * .68);
    }, 13, '#3ce0ff'),

    e_splitter: () => bake(54, (g, r) => {
      g.beginPath(); g.arc(0, 0, r * .55, 0, TAU); neon(g, '#3affa0', 3, 'rgba(4,32,20,.9)');
      g.strokeStyle = '#bfffe0'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(-r * .34, 0); g.lineTo(r * .34, 0);
      g.moveTo(0, -r * .34); g.lineTo(0, r * .34); g.stroke();
    }, 13, '#3affa0'),

    e_charger: () => bake(56, (g, r) => {
      g.beginPath();
      g.moveTo(r * .62, 0); g.lineTo(-r * .38, -r * .5);
      g.lineTo(-r * .16, 0); g.lineTo(-r * .38, r * .5);
      g.closePath(); neon(g, '#ffe23c', 3, 'rgba(36,30,2,.9)');
    }, 14, '#ffe23c'),

    e_bomber: () => bake(56, (g, r) => {
      star(g, 8, r * .58, r * .38); neon(g, '#ff5ecf', 3, 'rgba(34,6,26,.9)');
      g.fillStyle = '#ffd0f2'; g.beginPath(); g.arc(0, 0, r * .18, 0, TAU); g.fill();
    }, 15, '#ff5ecf'),

    e_orbiter: () => bake(46, (g, r) => {
      poly(g, 5, r * .55); neon(g, '#7cff2e', 3, 'rgba(16,34,4,.9)');
    }, 12, '#7cff2e'),

    e_boss: () => bake(180, (g, r) => {
      star(g, 6, r * .68, r * .38); neon(g, '#ff2e4d', 7, 'rgba(30,2,8,.95)');
      poly(g, 6, r * .34, 0); neon(g, '#ff9ba8', 4, 'rgba(60,4,14,.9)');
      g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, r * .12, 0, TAU); g.fill();
    }, 34, '#ff2e4d'),

    e_boss2: () => bake(180, (g, r) => {
      poly(g, 8, r * .64, Math.PI / 8); neon(g, '#c14dff', 7, 'rgba(22,4,40,.95)');
      g.strokeStyle = '#ecd0ff'; g.lineWidth = 4;
      g.beginPath(); g.arc(0, 0, r * .4, 0, TAU); g.stroke();
      g.beginPath(); g.arc(0, 0, r * .22, 0, TAU); g.stroke();
    }, 34, '#c14dff'),

    e_boss3: () => bake(180, (g, r) => {
      star(g, 5, r * .7, r * .3); neon(g, '#ffb02e', 7, 'rgba(40,22,2,.95)');
      poly(g, 3, r * .3); neon(g, '#fff0c4', 4, 'rgba(60,34,4,.9)');
    }, 34, '#ffb02e'),

    /* SƯƠNG HÀN VƯƠNG — bông tuyết 6 nhánh */
    e_boss4: () => bake(180, (g, r) => {
      star(g, 6, r * .82, r * .17); neon(g, '#6fe6ff', 6, 'rgba(4,26,40,.95)');
      g.strokeStyle = '#d6f8ff'; g.lineWidth = 3;
      for (let i = 0; i < 6; i++) {                 // gai băng phụ giữa các nhánh
        const a = i / 6 * TAU + Math.PI / 6;
        g.beginPath();
        g.moveTo(Math.cos(a) * r * .18, Math.sin(a) * r * .18);
        g.lineTo(Math.cos(a) * r * .5, Math.sin(a) * r * .5);
        g.stroke();
      }
      poly(g, 6, r * .24, 0); neon(g, '#eafcff', 3, 'rgba(10,40,60,.9)');
    }, 34, '#6fe6ff'),

    /* NGHỊCH ẢNH — hai bản sao lệch nhau qua một trục gương.
       ⚠ Đừng vẽ thành sao 6 cánh: trùng hệt HUYẾT NHÃN, giữa trận
       người chơi không phân biệt nổi hai con. */
    e_boss5: () => bake(180, (g, r) => {
      g.save(); g.translate(-r * .13, 0);
      poly(g, 4, r * .7); neon(g, '#1fd98a', 5, 'rgba(2,26,16,.7)');
      g.restore();
      g.save(); g.translate(r * .13, 0);
      poly(g, 4, r * .7); neon(g, '#9dffd6', 5, 'rgba(2,26,16,.5)');
      g.restore();
      g.strokeStyle = '#eafff6'; g.lineWidth = 3;      // trục gương
      g.beginPath(); g.moveTo(0, -r * .82); g.lineTo(0, r * .82); g.stroke();
      poly(g, 4, r * .21, Math.PI / 4); neon(g, '#3affa0', 3, '#04150e');
    }, 34, '#3affa0'),

    /* HẮC NHẬT — vành nhật hoa, lõi tối đen */
    e_boss6: () => bake(180, (g, r) => {
      star(g, 16, r * .8, r * .56); neon(g, '#ff6a2e', 5, 'rgba(38,10,2,.95)');
      g.beginPath(); g.arc(0, 0, r * .48, 0, TAU);
      neon(g, '#ffb27a', 4, 'rgba(52,16,4,.95)');
      g.fillStyle = '#05060c';                      // lõi đen: đây là NHẬT THỰC
      g.beginPath(); g.arc(0, 0, r * .3, 0, TAU); g.fill();
      g.strokeStyle = '#ffd9b0'; g.lineWidth = 2.4; g.stroke();
    }, 34, '#ff6a2e'),

    /* TRÙNG MẪU — tổ ong ba ổ trứng */
    e_boss7: () => bake(180, (g, r) => {
      poly(g, 6, r * .78, 0); neon(g, '#ff2e88', 6, 'rgba(40,2,20,.95)');
      for (let i = 0; i < 3; i++) {
        const a = i / 3 * TAU - Math.PI / 2;
        g.save();
        g.translate(Math.cos(a) * r * .36, Math.sin(a) * r * .36);
        poly(g, 6, r * .2, 0); neon(g, '#ffb3d6', 2.6, 'rgba(72,4,36,.9)');
        g.restore();
      }
    }, 34, '#ff2e88'),

    /* VÔ TẬN — vòng đồng tâm không có điểm dừng */
    e_boss8: () => bake(180, (g, r) => {
      poly(g, 12, r * .8, 0); neon(g, '#eafcff', 5, 'rgba(10,18,34,.95)');
      g.strokeStyle = '#8ff6ff'; g.lineWidth = 3;
      for (let i = 3; i >= 1; i--) {
        g.beginPath(); g.arc(0, 0, r * .17 * i, 0, TAU); g.stroke();
      }
      star(g, 4, r * .62, r * .1); neon(g, '#fff', 3, 'rgba(190,240,255,.22)');
    }, 34, '#eafcff'),

    /* ============ PROJECTILES ============ */
    b_basic: () => bake(20, (g, r) => {
      g.fillStyle = '#eafcff';
      g.beginPath(); g.ellipse(0, 0, r * .62, r * .26, 0, 0, TAU); g.fill();
      g.fillStyle = 'rgba(37,244,238,.75)';
      g.beginPath(); g.ellipse(-r * .18, 0, r * .5, r * .18, 0, 0, TAU); g.fill();
    }, 10, '#25f4ee'),

    b_pellet: () => bake(14, (g, r) => {
      g.fillStyle = '#fff2c4'; g.beginPath(); g.arc(0, 0, r * .38, 0, TAU); g.fill();
    }, 8, '#ffc93c'),

    b_missile: () => bake(24, (g, r) => {
      g.beginPath(); g.moveTo(r * .6, 0); g.lineTo(-r * .4, -r * .3); g.lineTo(-r * .2, 0); g.lineTo(-r * .4, r * .3);
      g.closePath(); g.fillStyle = '#ffd2e6'; g.fill();
      g.strokeStyle = '#ff2e88'; g.lineWidth = 1.6; g.stroke();
    }, 12, '#ff2e88'),

    b_bomb: () => bake(26, (g, r) => {
      g.beginPath(); g.arc(0, 0, r * .48, 0, TAU);
      g.fillStyle = '#2b3350'; g.fill();
      g.strokeStyle = '#ffb02e'; g.lineWidth = 2.5; g.stroke();
      g.fillStyle = '#ffe6b0'; g.beginPath(); g.arc(0, -r * .2, r * .12, 0, TAU); g.fill();
    }, 12, '#ffb02e'),

    b_blade: () => bake(46, (g, r) => {
      g.beginPath();
      g.arc(0, 0, r * .62, -.9, .9);
      g.arc(r * .28, 0, r * .42, .9, -.9, true);
      g.closePath();
      g.fillStyle = 'rgba(230,255,255,.92)'; g.fill();
      g.strokeStyle = '#25f4ee'; g.lineWidth = 2; g.stroke();
    }, 16, '#25f4ee'),

    b_frost: () => bake(22, (g, r) => {
      star(g, 6, r * .5, r * .2); g.fillStyle = '#d6f6ff'; g.fill();
      g.strokeStyle = '#6fe6ff'; g.lineWidth = 1.4; g.stroke();
    }, 11, '#6fe6ff'),

    b_enemy: () => bake(20, (g, r) => {
      g.beginPath(); g.arc(0, 0, r * .42, 0, TAU);
      g.fillStyle = '#ffd6f0'; g.fill();
      g.strokeStyle = '#ff3ca0'; g.lineWidth = 2; g.stroke();
    }, 11, '#ff3ca0'),

    b_shard: () => bake(20, (g, r) => {
      g.beginPath(); g.moveTo(r * .55, 0); g.lineTo(0, -r * .22); g.lineTo(-r * .35, 0); g.lineTo(0, r * .22);
      g.closePath(); g.fillStyle = '#e6ffb0'; g.fill();
      g.strokeStyle = '#b6ff3a'; g.lineWidth = 1.4; g.stroke();
    }, 10, '#b6ff3a'),

    b_orb: () => bake(30, (g, r) => {
      g.beginPath(); g.arc(0, 0, r * .44, 0, TAU);
      g.fillStyle = 'rgba(200,150,255,.9)'; g.fill();
      g.strokeStyle = '#c14dff'; g.lineWidth = 2.4; g.stroke();
    }, 14, '#c14dff'),

    /* ============ PICKUPS ============ */
    p_xp1: () => bake(20, (g, r) => { poly(g, 4, r * .45); neon(g, '#25f4ee', 2, 'rgba(20,220,220,.85)'); }, 10, '#25f4ee'),
    p_xp2: () => bake(24, (g, r) => { poly(g, 4, r * .5); neon(g, '#b6ff3a', 2.2, 'rgba(150,240,60,.9)'); }, 12, '#b6ff3a'),
    p_xp3: () => bake(30, (g, r) => { star(g, 5, r * .55, r * .26); neon(g, '#ffc93c', 2.4, 'rgba(255,190,60,.9)'); }, 15, '#ffc93c'),
    p_coin: () => bake(22, (g, r) => {
      g.beginPath(); g.arc(0, 0, r * .42, 0, TAU);
      g.fillStyle = '#ffd96b'; g.fill(); g.strokeStyle = '#a86e00'; g.lineWidth = 1.6; g.stroke();
      g.fillStyle = '#a86e00'; g.font = 'bold 9px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('$', 0, .5);
    }, 11, '#ffc93c'),
    p_heart: () => bake(26, (g, r) => {
      const s = r * .05;
      g.beginPath();
      g.moveTo(0, r * .42);
      g.bezierCurveTo(-9 * s, r * .08, -7 * s, -r * .48, 0, -r * .16);
      g.bezierCurveTo(7 * s, -r * .48, 9 * s, r * .08, 0, r * .42);
      g.fillStyle = '#ff4d6b'; g.fill();
      g.strokeStyle = '#ffd0d8'; g.lineWidth = 1.4; g.stroke();
    }, 13, '#ff4d6b'),
    p_magnet: () => bake(28, (g, r) => {
      g.strokeStyle = '#4de1ff'; g.lineWidth = r * .22; g.lineCap = 'butt';
      g.beginPath(); g.arc(0, r * .1, r * .38, Math.PI, 0); g.stroke();
      g.strokeStyle = '#ff4d5e';
      g.beginPath(); g.moveTo(-r * .38, r * .1); g.lineTo(-r * .38, r * .34); g.stroke();
      g.beginPath(); g.moveTo(r * .38, r * .1); g.lineTo(r * .38, r * .34); g.stroke();
    }, 13, '#4de1ff'),
    p_nuke: () => bake(30, (g, r) => {
      g.beginPath(); g.arc(0, 0, r * .48, 0, TAU); g.fillStyle = '#1a1030'; g.fill();
      g.strokeStyle = '#ffe23c'; g.lineWidth = 2; g.stroke();
      g.fillStyle = '#ffe23c';
      for (let i = 0; i < 3; i++) {
        g.beginPath(); g.moveTo(0, 0);
        g.arc(0, 0, r * .38, i / 3 * TAU - .38, i / 3 * TAU + .38); g.closePath(); g.fill();
      }
    }, 15, '#ffe23c'),
    p_chest: () => bake(40, (g, r) => {
      g.fillStyle = '#3a2a12'; g.strokeStyle = '#ffc93c'; g.lineWidth = 2.4;
      g.beginPath(); g.rect(-r * .5, -r * .18, r, r * .6); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(-r * .5, -r * .18); g.arc(0, -r * .18, r * .5, Math.PI, 0); g.closePath();
      g.fill(); g.stroke();
      g.fillStyle = '#ffe9a8'; g.fillRect(-r * .09, -r * .3, r * .18, r * .34);
    }, 18, '#ffc93c'),

    /* ============ MISC ============ */
    glow: () => {
      const s = 128, c = document.createElement('canvas'); c.width = c.height = s;
      const g = c.getContext('2d');
      const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(.25, 'rgba(255,255,255,.55)');
      gr.addColorStop(.55, 'rgba(255,255,255,.16)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, s, s);
      return c;
    },
    spark: () => {
      const s = 32, c = document.createElement('canvas'); c.width = c.height = s;
      const g = c.getContext('2d');
      const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(.4, 'rgba(255,255,255,.35)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, s, s);
      return c;
    },
    shadow: () => {
      const s = 64, c = document.createElement('canvas'); c.width = c.height = s;
      const g = c.getContext('2d');
      const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      gr.addColorStop(0, 'rgba(0,0,0,.5)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, s, s);
      return c;
    }
  }
};

/* tint a baked sprite (cached per color) */
const _tintCache = Object.create(null);
function tinted(key, color) {
  const k = key + '|' + color;
  let c = _tintCache[k];
  if (c) return c;
  const src = Art.get(key);
  c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = color; g.globalAlpha = .75;
  g.fillRect(0, 0, c.width, c.height);
  _tintCache[k] = c;
  return c;
}
/* pure-white silhouette for hit flash */
const _flashCache = Object.create(null);
function flashed(key) {
  let c = _flashCache[key];
  if (c) return c;
  const src = Art.get(key);
  c = document.createElement('canvas');
  c.width = src.width; c.height = src.height;
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-atop';
  g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
  _flashCache[key] = c;
  return c;
}

/* ================= Particles ================= */
const Particles = {
  pool: new Pool(
    () => ({}),
    (p, o) => {
      p.x = o.x; p.y = o.y;
      p.vx = o.vx || 0; p.vy = o.vy || 0;
      p.life = p.maxLife = o.life || .5;
      p.size = o.size || 4; p.size2 = o.size2 === undefined ? 0 : o.size2;
      p.color = o.color || '#fff';
      p.drag = o.drag === undefined ? .9 : o.drag;
      p.type = o.type || 'spark';
      p.rot = o.rot || 0; p.spin = o.spin || 0;
      p.grav = o.grav || 0;
      p.add = o.add !== false;
    }
  ),
  cap: 600,   // trần hạt: 900 làm màn hình trắng xoá, không thấy quái đâu nữa

  emit(o) { if (this.pool.count < this.cap) this.pool.spawn(o); },

  burst(x, y, n, color, opt = {}) {
    const spd = opt.speed || 200, life = opt.life || .45, size = opt.size || 5;
    for (let i = 0; i < n; i++) {
      if (this.pool.count >= this.cap) return;
      const a = opt.angle !== undefined ? opt.angle + rand(-opt.spread, opt.spread) : rand(TAU);
      const s = spd * rand(.35, 1.15);
      this.pool.spawn({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: life * rand(.6, 1.25), size: size * rand(.6, 1.3), size2: 0,
        color, drag: opt.drag || .9, type: opt.type || 'spark', grav: opt.grav || 0
      });
    }
  },

  ring(x, y, r, color, life = .35, w = 4) {
    this.emit({ x, y, life, size: r * .2, size2: r, color, type: 'ring', drag: 1, vx: w });
  },

  shockwave(x, y, r, color) {
    this.ring(x, y, r, color, .45, 6);
    this.ring(x, y, r * .6, '#ffffff', .25, 3);
  },

  trail(x, y, color, size = 4, life = .3) {
    this.emit({ x, y, vx: rand(-18, 18), vy: rand(-18, 18), life, size, size2: 0, color, drag: .88 });
  },

  smoke(x, y, color = '#556', n = 4) {
    for (let i = 0; i < n; i++)
      this.emit({
        x: x + rand(-6, 6), y: y + rand(-6, 6), vx: rand(-30, 30), vy: rand(-60, -10),
        life: rand(.5, 1), size: rand(6, 14), size2: rand(18, 30), color, drag: .93, type: 'smoke', add: false
      });
  },

  update(dt) {
    const a = this.pool.active;
    for (let i = 0; i < a.length; i++) {
      const p = a[i];
      p.life -= dt;
      if (p.life <= 0) { p.dead = true; continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += p.grav * dt;
      const d = Math.pow(p.drag, dt * 60);
      p.vx *= d; p.vy *= d;
      p.rot += p.spin * dt;
    }
    this.pool.sweep();
  },

  draw(g) {
    Art.get('spark'); // ensure base sprite is baked
    const a = this.pool.active;
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < a.length; i++) {
      const p = a[i];
      const t = p.life / p.maxLife;
      if (p.type === 'ring') {
        const r = lerp(p.size, p.size2, 1 - t);
        g.globalAlpha = t * .9;
        g.strokeStyle = p.color; g.lineWidth = p.vx * t + .6;
        g.beginPath(); g.arc(p.x, p.y, r, 0, TAU); g.stroke();
        continue;
      }
      if (p.type === 'smoke') {
        if (p.add) g.globalCompositeOperation = 'lighter';
        else g.globalCompositeOperation = 'source-over';
        const s = lerp(p.size, p.size2, 1 - t);
        g.globalAlpha = t * .35;
        g.fillStyle = p.color;
        g.beginPath(); g.arc(p.x, p.y, s, 0, TAU); g.fill();
        g.globalCompositeOperation = 'lighter';
        continue;
      }
      const s = p.size * (p.size2 ? lerp(1, p.size2 / p.size, 1 - t) : t);
      const al = Math.min(1, t * 1.4);
      // coloured additive halo
      g.globalAlpha = al * .9;
      g.drawImage(sparkOf(p.color), p.x - s * 1.7, p.y - s * 1.7, s * 3.4, s * 3.4);
      // hot white core
      g.globalAlpha = al;
      g.fillStyle = '#fff';
      g.beginPath(); g.arc(p.x, p.y, s * .42, 0, TAU); g.fill();
    }
    g.restore();
  },

  clear() { this.pool.clear(); }
};

/* colored additive sprite draw (uses a per-color tinted spark) */
const _sparkTint = Object.create(null);
function sparkOf(color) {
  let c = _sparkTint[color];
  if (c) return c;
  const src = Art.get('spark');
  c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
  _sparkTint[color] = c;
  return c;
}

/* ================= Floating text ================= */
const FloatText = {
  pool: new Pool(() => ({}), (o, x, y, text, color, size, vy) => {
    o.x = x; o.y = y; o.text = text; o.color = color || '#fff';
    o.size = size || 15; o.life = o.maxLife = .85;
    o.vy = vy === undefined ? -62 : vy; o.vx = rand(-26, 26);
  }),
  add(x, y, text, color, size) { if (this.pool.count < 90) this.pool.spawn(x, y, text, color, size); },
  update(dt) {
    for (const o of this.pool.active) {
      o.life -= dt;
      if (o.life <= 0) { o.dead = true; continue; }
      o.x += o.vx * dt; o.y += o.vy * dt;
      o.vy += 130 * dt; o.vx *= .94;
    }
    this.pool.sweep();
  },
  draw(g) {
    g.save();
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const o of this.pool.active) {
      const t = o.life / o.maxLife;
      const pop = t > .82 ? 1 + (t - .82) * 3.2 : 1;
      g.globalAlpha = Math.min(1, t * 2.2);
      g.font = `900 ${o.size * pop}px "Segoe UI",system-ui,sans-serif`;
      g.lineWidth = 3.4; g.strokeStyle = 'rgba(0,0,0,.8)';
      g.strokeText(o.text, o.x, o.y);
      g.fillStyle = o.color;
      g.fillText(o.text, o.x, o.y);
    }
    g.restore();
  },
  clear() { this.pool.clear(); }
};

/* ================= Camera / screen fx ================= */
const Cam = {
  x: 0, y: 0, tx: 0, ty: 0,
  shake: 0, shakeD: 0, ox: 0, oy: 0,
  zoom: 1, tzoom: 1,
  flash: 0, flashColor: '#fff',
  W: 0, H: 0,

  follow(x, y, dt, instant) {
    this.tx = x; this.ty = y;
    if (instant) { this.x = x; this.y = y; return; }
    const k = 1 - Math.pow(.0015, dt);
    this.x = lerp(this.x, x, k);
    this.y = lerp(this.y, y, k);
  },
  /**
   * Rung màn hình có GIẢM DẦN: càng đang rung mạnh thì cú rung mới càng ít tác dụng.
   * Nếu cộng thẳng, một loạt 14 vụ nổ sẽ đẩy độ rung chạm trần và màn hình giật liên tục.
   */
  SHAKE_CAP: 12,
  addShake(v) {
    const cap = this.SHAKE_CAP;
    this.shake = Math.min(cap, this.shake + v * (1 - this.shake / cap));
  },
  update(dt) {
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 52);
      const s = this.shake;
      this.ox = rand(-s, s); this.oy = rand(-s, s);
    } else { this.ox = this.oy = 0; }
    this.zoom = lerp(this.zoom, this.tzoom, 1 - Math.pow(.002, dt));
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 3.4);
  },
  apply(g) {
    g.translate(this.W / 2 + this.ox, this.H / 2 + this.oy);
    g.scale(this.zoom, this.zoom);
    g.translate(-this.x, -this.y);
  },
  toWorld(sx, sy) {
    return {
      x: (sx - this.W / 2) / this.zoom + this.x,
      y: (sy - this.H / 2) / this.zoom + this.y
    };
  },
  doFlash(c, a = 1) { this.flashColor = c; this.flash = a; }
};
