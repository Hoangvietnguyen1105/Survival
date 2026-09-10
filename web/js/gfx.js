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

/**
 * CHUỘT ĐẦU BẾP — dùng chung cho cả 5 nhân vật, chỉ khác màu và phụ kiện.
 *
 * Vẽ theo hướng NHÌN TỪ TRÊN XUỐNG hơi chếch, mũi quay LÊN (-Y). `drawPlayer` xoay sprite
 * theo `p.face + PI/2`, nên cứ vẽ đầu ở trên và đuôi ở dưới là nhân vật quay đúng hướng chạy.
 *
 * ⚠ THỨ TỰ VẼ là thứ mất công nhất ở đây, đừng đảo:
 *   đuôi → chân → thân → tạp dề → dụng cụ → tai → MŨ → ĐẦU → mặt
 *   · Mũ vẽ TRƯỚC đầu và đặt LÙI VỀ SAU (+Y): nhìn từ trên xuống mà đặt mũ đúng tâm đầu
 *     thì nó che kín mặt, con chuột thành một cục trắng không rõ đang quay hướng nào.
 *   · Mũ phải tô TRẮNG ĐẶC + VIỀN TỐI, vì `shadowBlur` của bake() làm mọi thứ nhoè;
 *     tô trắng mà không viền thì mũ lẫn hẳn vào màu thân (đã thử, không nhìn ra mũ).
 *   · Mặt (mõm, mũi, mắt, ria) vẽ CUỐI CÙNG để luôn nằm trên cùng.
 *
 * o = { body, trim, hat, apron, band, whisk, tongs, slim }
 */
function ratChef(g, r, o) {
  const R = r * .72;
  const skin = '#f6c9cf';
  const ink = '#2b2320';

  /* đuôi cong về phía sau */
  g.strokeStyle = skin; g.lineWidth = R * .09; g.lineCap = 'round';
  g.beginPath();
  g.moveTo(0, R * .55);
  g.quadraticCurveTo(R * .4, R * .95, -R * .08, R * 1.1);
  g.stroke();

  /* bốn bàn chân */
  g.fillStyle = skin;
  for (const s of [-1, 1]) {
    g.beginPath(); g.ellipse(s * R * .44, R * .42, R * .11, R * .17, s * .5, 0, TAU); g.fill();
    g.beginPath(); g.ellipse(s * R * .4, -R * .02, R * .1, R * .14, s * .4, 0, TAU); g.fill();
  }

  /* thân */
  g.beginPath();
  g.ellipse(0, R * .2, R * (o.slim ? .36 : .45), R * .52, 0, 0, TAU);
  neon(g, o.body, 3.4, 'rgba(62,48,40,.94)');

  /* tạp dề */
  if (o.apron) {
    g.save(); g.globalAlpha = .92;
    g.fillStyle = o.trim;
    g.beginPath();
    g.moveTo(-R * .2, -R * .05); g.lineTo(R * .2, -R * .05);
    g.lineTo(R * .3, R * .58); g.lineTo(-R * .3, R * .58);
    g.closePath(); g.fill();
    g.restore();
    g.strokeStyle = ink; g.lineWidth = 1.8; g.stroke();
    g.beginPath(); g.moveTo(-R * .25, R * .26); g.lineTo(R * .25, R * .26); g.stroke();
  }

  /* dụng cụ cầm tay */
  if (o.whisk) {                       // cái đánh trứng
    g.strokeStyle = '#e8eeff'; g.lineWidth = 2.4;
    g.beginPath(); g.moveTo(R * .48, R * .16); g.lineTo(R * .72, -R * .24); g.stroke();
    for (let i = -1; i <= 1; i++) {
      g.beginPath();
      g.moveTo(R * .72, -R * .24);
      g.quadraticCurveTo(R * (.86 + i * .1), -R * .44, R * .72, -R * .6);
      g.stroke();
    }
  }
  if (o.tongs) {                       // cái kẹp gắp
    g.strokeStyle = '#e8eeff'; g.lineWidth = 2.6;
    g.beginPath(); g.moveTo(R * .46, R * .2); g.lineTo(R * .76, -R * .3); g.stroke();
    g.beginPath(); g.moveTo(R * .46, R * .2); g.lineTo(R * .6, -R * .38); g.stroke();
  }

  /* tai — rộng ra hai bên nên luôn nhô ra ngoài vành mũ */
  for (const s of [-1, 1]) {
    g.beginPath(); g.arc(s * R * .44, -R * .38, R * .19, 0, TAU);
    g.fillStyle = skin; g.fill();
    g.strokeStyle = ink; g.lineWidth = 2.2; g.stroke();
    g.fillStyle = 'rgba(255,145,175,.9)';
    g.beginPath(); g.arc(s * R * .44, -R * .38, R * .095, 0, TAU); g.fill();
  }

  /* ĐẦU */
  g.beginPath(); g.arc(0, -R * .5, R * .3, 0, TAU);
  neon(g, o.body, 3, 'rgba(74,58,48,.96)');

  /* ===== Từ đây trở xuống TẮT QUẦNG SÁNG =====
     bake() bật shadowBlur cho MỌI nét vẽ. Cái mũ tô trắng mà vẫn để quầng sáng thì bị
     nhuộm theo màu thân và nhìn ra một cục mờ, không ai biết đó là mũ đầu bếp (đã thử hai
     lần). Mặt cũng vậy: mắt và ria bị quầng sáng ăn mất. */
  g.save();
  g.shadowBlur = 0;

  /* MŨ ĐẦU BẾP — chùm phồng trắng đội trên đầu, hơi lùi về sau để chừa chỗ cho mặt */
  const H = R * .3 * (o.hat || 1);
  const hy = -R * .38;
  for (let i = 0; i < 6; i++) {                  // các múi phồng quanh vành
    const a = i / 6 * TAU;
    g.beginPath();
    g.arc(Math.cos(a) * H * .6, hy + Math.sin(a) * H * .6, H * .52, 0, TAU);
    g.fillStyle = '#ffffff'; g.fill();
    g.strokeStyle = ink; g.lineWidth = 1.8; g.stroke();
  }
  g.beginPath(); g.arc(0, hy, H * .7, 0, TAU);   // đỉnh mũ
  g.fillStyle = '#ffffff'; g.fill();
  g.strokeStyle = ink; g.lineWidth = 2.2; g.stroke();
  /* vành mũ / khăn buộc đầu, mang màu riêng của từng nhân vật */
  g.lineCap = 'butt';
  g.strokeStyle = o.trim; g.lineWidth = R * (o.band ? .14 : .1);
  g.beginPath();
  if (o.band) g.arc(0, hy, H * 1.02, .5, Math.PI - .5);
  else g.arc(0, hy, H * 1.02, 0, TAU);
  g.stroke();
  g.strokeStyle = ink; g.lineWidth = 1.4; g.stroke();
  g.lineCap = 'round';

  /* MẶT — vẽ cuối cùng nên luôn nằm trên cùng */
  g.fillStyle = skin;
  g.beginPath(); g.ellipse(0, -R * .76, R * .16, R * .18, 0, 0, TAU); g.fill();
  g.strokeStyle = ink; g.lineWidth = 1.8; g.stroke();
  g.fillStyle = '#ff5c80';
  g.beginPath(); g.arc(0, -R * .86, R * .07, 0, TAU); g.fill();
  g.fillStyle = '#15100e';
  for (const s of [-1, 1]) {
    g.beginPath(); g.arc(s * R * .2, -R * .66, R * .055, 0, TAU); g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath(); g.arc(s * R * .21, -R * .68, R * .02, 0, TAU); g.fill();
    g.fillStyle = '#15100e';
  }
  g.strokeStyle = 'rgba(30,22,18,.85)'; g.lineWidth = 1.6;
  for (const s of [-1, 1]) {
    g.beginPath(); g.moveTo(s * R * .12, -R * .8); g.lineTo(s * R * .58, -R * .94); g.stroke();
    g.beginPath(); g.moveTo(s * R * .13, -R * .73); g.lineTo(s * R * .6, -R * .71); g.stroke();
  }

  g.restore();
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

    /* ============ NHÂN VẬT — CHUỘT ĐẦU BẾP ============
       Sprite được vẽ theo hướng NHÌN TỪ TRÊN XUỐNG, mũi quay lên (-Y): drawPlayer xoay
       sprite theo `p.face + PI/2` nên cứ vẽ đầu ở trên, đuôi ở dưới là đúng hướng chạy. */
    ch_guard: () => bake(72, (g, r) => ratChef(g, r, {
      body: '#ff8a3c', trim: '#ffd9a8', hat: 1.15, apron: true
    }), 16, '#ff8a3c'),

    ch_ranger: () => bake(72, (g, r) => ratChef(g, r, {
      body: '#25f4ee', trim: '#d6fdff', hat: .8, band: true
    }), 16, '#25f4ee'),

    ch_mage: () => bake(72, (g, r) => ratChef(g, r, {
      body: '#9d6bff', trim: '#e4d6ff', hat: 1.3, whisk: true
    }), 18, '#9d6bff'),

    ch_assassin: () => bake(72, (g, r) => ratChef(g, r, {
      body: '#ff2e88', trim: '#ffd0e6', hat: .55, band: true, slim: true
    }), 16, '#ff2e88'),

    ch_engineer: () => bake(72, (g, r) => ratChef(g, r, {
      body: '#b6ff3a', trim: '#eaffc4', hat: 1, apron: true, tongs: true
    }), 16, '#b6ff3a'),

    /* ============ QUÁI — ĐỒ ĂN ============ */

    /* CÀ CHUA — tròn, cuống lá xanh 5 cánh */
    e_grunt: () => bake(48, (g, r) => {
      g.beginPath(); g.arc(0, r * .04, r * .56, 0, TAU);
      neon(g, '#ff4d5e', 3, 'rgba(120,14,22,.92)');
      g.fillStyle = 'rgba(255,160,170,.35)';                 // vệt sáng bóng vỏ
      g.beginPath(); g.ellipse(-r * .18, -r * .16, r * .16, r * .1, -.6, 0, TAU); g.fill();
      g.fillStyle = '#3affa0';                               // cuống
      star(g, 5, r * .3, r * .1, -Math.PI / 2); g.fill();
      g.strokeStyle = '#7cff2e'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(0, -r * .3); g.lineTo(0, -r * .52); g.stroke();
    }, 12, '#ff4d5e'),

    /* CÀ RỐT — nhỏ, nhanh, nhọn về phía trước */
    e_swarm: () => bake(34, (g, r) => {
      g.beginPath();
      g.moveTo(0, -r * .66); g.lineTo(r * .3, r * .3); g.lineTo(-r * .3, r * .3);
      g.closePath(); neon(g, '#ffa62e', 2.4, 'rgba(80,38,2,.92)');
      g.strokeStyle = 'rgba(255,220,170,.55)'; g.lineWidth = 1.2;
      for (let i = -1; i <= 1; i++) {
        g.beginPath(); g.moveTo(-r * .18, i * r * .16 + r * .05); g.lineTo(r * .18, i * r * .16 + r * .05); g.stroke();
      }
      g.strokeStyle = '#7cff2e'; g.lineWidth = 2.2;          // lá ở gốc
      for (let i = -1; i <= 1; i++) {
        g.beginPath(); g.moveTo(0, r * .3); g.lineTo(i * r * .26, r * .62); g.stroke();
      }
    }, 9, '#ffa62e'),

    /* BẮP CẢI TÍM — to, chậm, nhiều lớp lá */
    e_tank: () => bake(76, (g, r) => {
      g.beginPath(); g.arc(0, 0, r * .64, 0, TAU);
      neon(g, '#8f5bff', 5, 'rgba(30,10,58,.94)');
      g.strokeStyle = 'rgba(200,170,255,.7)'; g.lineWidth = 2.4;
      for (let i = 1; i <= 3; i++) {                          // các lớp lá cuộn
        g.beginPath(); g.arc(0, 0, r * .16 * i, 0, TAU); g.stroke();
      }
      g.strokeStyle = '#e0d2ff'; g.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * TAU;
        g.beginPath();
        g.moveTo(Math.cos(a) * r * .16, Math.sin(a) * r * .16);
        g.lineTo(Math.cos(a) * r * .6, Math.sin(a) * r * .6); g.stroke();
      }
    }, 16, '#8f5bff'),

    /* CHAI XỐT — đứng xa phun xốt */
    e_shooter: () => bake(50, (g, r) => {
      g.beginPath();                                          // thân chai
      g.moveTo(-r * .3, r * .5); g.lineTo(-r * .3, -r * .1);
      g.lineTo(-r * .12, -r * .34); g.lineTo(r * .12, -r * .34);
      g.lineTo(r * .3, -r * .1); g.lineTo(r * .3, r * .5);
      g.closePath(); neon(g, '#3ce0ff', 3, 'rgba(4,40,54,.92)');
      g.fillStyle = '#bff2ff';                                // vòi
      g.fillRect(-r * .07, -r * .62, r * .14, r * .3);
      g.fillStyle = 'rgba(191,242,255,.45)';                  // nhãn
      g.fillRect(-r * .24, r * .04, r * .48, r * .22);
    }, 13, '#3ce0ff'),

    /* BÔNG CẢI XANH — chết thì tách ra thành các nhánh nhỏ */
    e_splitter: () => bake(54, (g, r) => {
      g.strokeStyle = '#bfffe0'; g.lineWidth = r * .16;       // cọng
      g.beginPath(); g.moveTo(0, r * .5); g.lineTo(0, 0); g.stroke();
      for (let i = 0; i < 4; i++) {                           // 4 chùm hoa
        const a = -Math.PI / 2 + (i - 1.5) * .62;
        g.save(); g.translate(Math.cos(a) * r * .34, Math.sin(a) * r * .34);
        g.beginPath(); g.arc(0, 0, r * .24, 0, TAU);
        neon(g, '#3affa0', 2.4, 'rgba(4,44,26,.92)');
        g.restore();
      }
    }, 13, '#3affa0'),

    /* BẮP NGÔ — lao thẳng vào người chơi */
    e_charger: () => bake(56, (g, r) => {
      g.beginPath();
      g.ellipse(0, 0, r * .28, r * .6, 0, 0, TAU);
      neon(g, '#ffe23c', 3, 'rgba(70,58,2,.92)');
      g.fillStyle = 'rgba(255,240,160,.8)';                   // hạt ngô
      for (let y = -2; y <= 2; y++) {
        for (let x = -1; x <= 1; x++) {
          g.beginPath();
          g.arc(x * r * .15, y * r * .19 + (x ? r * .09 : 0), r * .055, 0, TAU); g.fill();
        }
      }
      g.strokeStyle = '#7cff2e'; g.lineWidth = 2.4;           // lá bẹ
      g.beginPath(); g.moveTo(-r * .22, r * .42); g.lineTo(-r * .44, r * .68); g.stroke();
      g.beginPath(); g.moveTo(r * .22, r * .42); g.lineTo(r * .44, r * .68); g.stroke();
    }, 14, '#ffe23c'),

    /* THANH LONG — chết thì nổ tung */
    e_bomber: () => bake(56, (g, r) => {
      g.beginPath(); g.arc(0, 0, r * .48, 0, TAU);
      neon(g, '#ff5ecf', 3, 'rgba(70,4,52,.92)');
      g.fillStyle = '#ffd0f2';                                 // vảy
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * TAU;
        g.save(); g.translate(Math.cos(a) * r * .5, Math.sin(a) * r * .5); g.rotate(a);
        g.beginPath(); g.moveTo(r * .18, 0); g.lineTo(-r * .06, -r * .1); g.lineTo(-r * .06, r * .1);
        g.closePath(); g.fill();
        g.restore();
      }
      g.fillStyle = '#fff2fb';                                 // ruột trắng
      g.beginPath(); g.arc(0, 0, r * .22, 0, TAU); g.fill();
      g.fillStyle = '#3a1030';
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * TAU + .5;
        g.beginPath(); g.arc(Math.cos(a) * r * .11, Math.sin(a) * r * .11, r * .035, 0, TAU); g.fill();
      }
    }, 15, '#ff5ecf'),

    /* ĐẬU HÀ LAN — bay vòng quanh người chơi */
    e_orbiter: () => bake(46, (g, r) => {
      g.beginPath();                                           // vỏ đậu
      g.ellipse(0, 0, r * .24, r * .58, 0, 0, TAU);
      neon(g, '#7cff2e', 2.6, 'rgba(16,46,4,.92)');
      g.fillStyle = '#d6ffb0';
      for (let i = -1; i <= 1; i++) {
        g.beginPath(); g.arc(0, i * r * .26, r * .13, 0, TAU); g.fill();
      }
    }, 12, '#7cff2e'),

    /* ============ TRÙM — MÓN ĂN KHỔNG LỒ ============ */

    /* NỒI LẨU CAY — luật KHÁT MÁU */
    e_boss: () => bake(180, (g, r) => {
      g.beginPath(); g.arc(0, 0, r * .7, 0, TAU);
      neon(g, '#ff2e4d', 7, 'rgba(56,4,12,.96)');
      g.beginPath(); g.arc(0, 0, r * .54, 0, TAU);             // mặt nước lẩu
      g.fillStyle = 'rgba(255,80,90,.4)'; g.fill();
      g.strokeStyle = '#ff9ba8'; g.lineWidth = 4; g.stroke();
      g.fillStyle = '#ffd9a8';                                  // ớt và hành nổi lềnh bềnh
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * TAU + .3;
        g.save(); g.translate(Math.cos(a) * r * .32, Math.sin(a) * r * .32); g.rotate(a);
        g.beginPath(); g.ellipse(0, 0, r * .13, r * .05, 0, 0, TAU); g.fill();
        g.restore();
      }
      g.strokeStyle = '#ff2e4d'; g.lineWidth = 8;               // hai quai nồi
      g.beginPath(); g.arc(-r * .78, 0, r * .16, -1.2, 1.2); g.stroke();
      g.beginPath(); g.arc(r * .78, 0, r * .16, Math.PI - 1.2, Math.PI + 1.2); g.stroke();
    }, 34, '#ff2e4d'),

    /* CỐI XAY SINH TỐ — luật HẤP LỰC, hút người chơi vào */
    e_boss2: () => bake(180, (g, r) => {
      poly(g, 8, r * .64, Math.PI / 8);
      neon(g, '#c14dff', 7, 'rgba(30,4,54,.96)');
      g.strokeStyle = '#ecd0ff'; g.lineWidth = 4;               // xoáy
      g.beginPath(); g.arc(0, 0, r * .42, 0, TAU); g.stroke();
      g.fillStyle = '#e9c6ff';                                  // 4 lưỡi dao xay
      for (let i = 0; i < 4; i++) {
        const a = i / 4 * TAU + .4;
        g.save(); g.rotate(a);
        g.beginPath(); g.moveTo(0, 0); g.lineTo(r * .46, -r * .09); g.lineTo(r * .46, r * .05);
        g.closePath(); g.fill();
        g.restore();
      }
      g.fillStyle = '#2a0a40';
      g.beginPath(); g.arc(0, 0, r * .13, 0, TAU); g.fill();
    }, 34, '#c14dff'),

    /* NỒI ÁP SUẤT — luật XIỀNG XÍCH, không lướt được */
    e_boss3: () => bake(180, (g, r) => {
      g.beginPath(); g.arc(0, 0, r * .68, 0, TAU);
      neon(g, '#ffb02e', 7, 'rgba(64,34,2,.96)');
      g.strokeStyle = '#fff0c4'; g.lineWidth = 5;               // vành nắp
      g.beginPath(); g.arc(0, 0, r * .5, 0, TAU); g.stroke();
      g.fillStyle = '#fff0c4';                                  // các chốt khoá quanh vành
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * TAU;
        g.beginPath(); g.arc(Math.cos(a) * r * .59, Math.sin(a) * r * .59, r * .06, 0, TAU); g.fill();
      }
      g.beginPath(); g.arc(0, 0, r * .17, 0, TAU);              // van xả hơi ở giữa
      neon(g, '#ff6a2e', 4, 'rgba(80,20,2,.95)');
    }, 34, '#ffb02e'),

    /* VUA KEM — luật BĂNG GIÁ */
    e_boss4: () => bake(180, (g, r) => {
      g.beginPath();                                            // ốc quế
      g.moveTo(-r * .34, -r * .1); g.lineTo(0, r * .8); g.lineTo(r * .34, -r * .1);
      g.closePath(); neon(g, '#ffb02e', 5, 'rgba(58,32,2,.95)');
      g.strokeStyle = 'rgba(255,220,150,.6)'; g.lineWidth = 2;
      for (let i = -2; i <= 2; i++) {
        g.beginPath(); g.moveTo(-r * .3 + i * r * .04, r * .04 + Math.abs(i) * r * .12);
        g.lineTo(r * .3 + i * r * .04, r * .04 - Math.abs(i) * r * .12); g.stroke();
      }
      for (let i = 0; i < 3; i++) {                             // ba viên kem
        g.save(); g.translate((i - 1) * r * .3, -r * .34 - (i === 1 ? r * .16 : 0));
        g.beginPath(); g.arc(0, 0, r * .27, 0, TAU);
        neon(g, '#6fe6ff', 4, 'rgba(6,36,54,.95)');
        g.restore();
      }
      star(g, 6, r * .2, r * .07, -Math.PI / 2);                // bông tuyết trang trí
      g.fillStyle = '#eafcff'; g.fill();
    }, 34, '#6fe6ff'),

    /* THẠCH GƯƠNG — luật ĐẢO CHIỀU.
       ⚠ Giữ đúng bố cục "hai nửa lệch nhau qua một trục gương" của bản gốc: nếu vẽ tròn
       trịa như mấy con kia thì giữa trận không phân biệt nổi với NỒI LẨU CAY. */
    e_boss5: () => bake(180, (g, r) => {
      g.save(); g.translate(-r * .13, 0);
      poly(g, 4, r * .7); neon(g, '#1fd98a', 5, 'rgba(2,34,20,.7)');
      g.restore();
      g.save(); g.translate(r * .13, 0);
      poly(g, 4, r * .7); neon(g, '#9dffd6', 5, 'rgba(2,34,20,.5)');
      g.restore();
      g.strokeStyle = '#eafff6'; g.lineWidth = 3;               // trục gương
      g.beginPath(); g.moveTo(0, -r * .82); g.lineTo(0, r * .82); g.stroke();
      g.fillStyle = 'rgba(190,255,225,.5)';                     // vệt bóng trên mặt thạch
      g.beginPath(); g.ellipse(-r * .3, -r * .28, r * .16, r * .07, -.7, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(r * .3, -r * .28, r * .16, r * .07, .7, 0, TAU); g.fill();
      poly(g, 4, r * .21, Math.PI / 4); neon(g, '#3affa0', 3, '#04150e');
    }, 34, '#3affa0'),

    /* PIZZA HẮC ÁM — luật NHẬT THỰC, lõi cháy đen */
    e_boss6: () => bake(180, (g, r) => {
      g.beginPath(); g.arc(0, 0, r * .8, 0, TAU);               // viền bánh
      neon(g, '#ff6a2e', 5, 'rgba(62,20,2,.96)');
      g.beginPath(); g.arc(0, 0, r * .62, 0, TAU);              // mặt phô mai
      g.fillStyle = 'rgba(255,178,122,.35)'; g.fill();
      g.strokeStyle = '#ffb27a'; g.lineWidth = 3; g.stroke();
      g.strokeStyle = 'rgba(255,217,176,.5)'; g.lineWidth = 2;  // đường cắt 8 miếng
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * TAU;
        g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * r * .62, Math.sin(a) * r * .62); g.stroke();
      }
      g.fillStyle = '#ff4d5e';                                  // xúc xích
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * TAU + .4;
        g.beginPath(); g.arc(Math.cos(a) * r * .44, Math.sin(a) * r * .44, r * .09, 0, TAU); g.fill();
      }
      g.fillStyle = '#05060c';                                  // lõi cháy đen = NHẬT THỰC
      g.beginPath(); g.arc(0, 0, r * .28, 0, TAU); g.fill();
      g.strokeStyle = '#ffd9b0'; g.lineWidth = 2.4; g.stroke();
    }, 34, '#ff6a2e'),

    /* TỔ TRỨNG CÁ — luật TÁCH BẦY */
    e_boss7: () => bake(180, (g, r) => {
      poly(g, 6, r * .78, 0); neon(g, '#ff2e88', 6, 'rgba(62,4,32,.96)');
      for (let i = 0; i < 3; i++) {                             // ba ổ trứng
        const a = i / 3 * TAU - Math.PI / 2;
        g.save();
        g.translate(Math.cos(a) * r * .36, Math.sin(a) * r * .36);
        g.beginPath(); g.arc(0, 0, r * .22, 0, TAU);
        neon(g, '#ffb3d6', 2.6, 'rgba(96,4,48,.92)');
        g.fillStyle = 'rgba(255,140,190,.85)';
        for (let k = 0; k < 5; k++) {
          const b = k / 5 * TAU + i;
          g.beginPath(); g.arc(Math.cos(b) * r * .1, Math.sin(b) * r * .1, r * .05, 0, TAU); g.fill();
        }
        g.restore();
      }
    }, 34, '#ff2e88'),

    /* BÁNH KEM VÔ TẬN — luật THU HẸP, các tầng bánh đồng tâm */
    e_boss8: () => bake(180, (g, r) => {
      poly(g, 12, r * .8, 0); neon(g, '#eafcff', 5, 'rgba(18,26,42,.96)');
      for (let i = 3; i >= 1; i--) {                            // các tầng bánh
        g.beginPath(); g.arc(0, 0, r * .2 * i, 0, TAU);
        g.strokeStyle = '#8ff6ff'; g.lineWidth = 3; g.stroke();
        g.fillStyle = 'rgba(200,245,255,' + (.06 * (4 - i)) + ')'; g.fill();
      }
      g.fillStyle = '#ffd0e6';                                  // kem viền quanh tầng ngoài
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * TAU;
        g.beginPath(); g.arc(Math.cos(a) * r * .62, Math.sin(a) * r * .62, r * .06, 0, TAU); g.fill();
      }
      g.strokeStyle = '#ffe23c'; g.lineWidth = 4;               // ngọn nến trên cùng
      g.beginPath(); g.moveTo(0, r * .1); g.lineTo(0, -r * .22); g.stroke();
      g.fillStyle = '#ffe23c';
      g.beginPath(); g.ellipse(0, -r * .3, r * .06, r * .1, 0, 0, TAU); g.fill();
    }, 34, '#eafcff'),

    /* ============ ĐẠN — NGUYÊN LIỆU BAY ============ */

    /* giọt kem từ túi bắt bông */
    b_basic: () => bake(20, (g, r) => {
      g.fillStyle = '#fff6e0';
      g.beginPath(); g.ellipse(0, 0, r * .62, r * .3, 0, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,225,170,.8)';
      g.beginPath(); g.ellipse(-r * .18, 0, r * .5, r * .2, 0, 0, TAU); g.fill();
    }, 10, '#ffd9a8'),

    /* hạt tiêu */
    b_pellet: () => bake(14, (g, r) => {
      g.fillStyle = '#5a3a1a'; g.beginPath(); g.arc(0, 0, r * .38, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,242,196,.7)';
      g.beginPath(); g.arc(-r * .1, -r * .1, r * .14, 0, TAU); g.fill();
    }, 8, '#ffc93c'),

    /* xúc xích tầm nhiệt */
    b_missile: () => bake(24, (g, r) => {
      g.beginPath(); g.ellipse(r * .05, 0, r * .5, r * .22, 0, 0, TAU);
      g.fillStyle = '#ff8f6b'; g.fill();
      g.strokeStyle = '#c2431f'; g.lineWidth = 1.6; g.stroke();
      g.strokeStyle = 'rgba(90,26,10,.6)'; g.lineWidth = 1.2;   // vết nướng
      for (let i = -1; i <= 1; i++) {
        g.beginPath(); g.moveTo(i * r * .2, -r * .18); g.lineTo(i * r * .2 + r * .08, r * .18); g.stroke();
      }
    }, 12, '#ff8f6b'),

    /* nắm bột mì */
    b_bomb: () => bake(26, (g, r) => {
      g.beginPath(); g.arc(0, 0, r * .48, 0, TAU);
      g.fillStyle = '#f0e2c4'; g.fill();
      g.strokeStyle = '#c9a86b'; g.lineWidth = 2.2; g.stroke();
      g.fillStyle = 'rgba(255,255,255,.75)';
      g.beginPath(); g.arc(-r * .14, -r * .16, r * .12, 0, TAU); g.fill();
      g.beginPath(); g.arc(r * .16, r * .1, r * .08, 0, TAU); g.fill();
    }, 12, '#ffe6b0'),

    /* dao phay bay */
    b_blade: () => bake(46, (g, r) => {
      g.beginPath();                                            // lưỡi dao
      g.moveTo(-r * .5, -r * .3); g.lineTo(r * .5, -r * .3);
      g.lineTo(r * .5, r * .12); g.lineTo(-r * .5, r * .24);
      g.closePath();
      g.fillStyle = 'rgba(235,250,255,.95)'; g.fill();
      g.strokeStyle = '#9fd8ff'; g.lineWidth = 1.8; g.stroke();
      g.fillStyle = '#3a2a12';                                  // cán gỗ
      g.fillRect(-r * .72, -r * .12, r * .26, r * .24);
      g.fillStyle = 'rgba(255,255,255,.55)';                    // ánh thép
      g.fillRect(-r * .44, -r * .22, r * .86, r * .05);
    }, 16, '#eafcff'),

    /* viên đá lạnh */
    b_frost: () => bake(22, (g, r) => {
      poly(g, 4, r * .46, Math.PI / 4);
      g.fillStyle = 'rgba(214,246,255,.9)'; g.fill();
      g.strokeStyle = '#6fe6ff'; g.lineWidth = 1.6; g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(-r * .2, -r * .1); g.lineTo(0, -r * .28); g.lineTo(r * .2, -r * .1); g.stroke();
    }, 11, '#6fe6ff'),

    /* giọt xốt quái bắn ra */
    b_enemy: () => bake(20, (g, r) => {
      g.beginPath(); g.arc(0, 0, r * .42, 0, TAU);
      g.fillStyle = '#ffd6f0'; g.fill();
      g.strokeStyle = '#ff3ca0'; g.lineWidth = 2; g.stroke();
      g.fillStyle = 'rgba(255,255,255,.7)';
      g.beginPath(); g.arc(-r * .12, -r * .12, r * .1, 0, TAU); g.fill();
    }, 11, '#ff3ca0'),

    /* vụn bánh mì nướng */
    b_shard: () => bake(20, (g, r) => {
      g.beginPath(); g.moveTo(r * .55, -r * .08); g.lineTo(r * .05, -r * .3);
      g.lineTo(-r * .45, 0); g.lineTo(r * .02, r * .3);
      g.closePath(); g.fillStyle = '#ffe0a0'; g.fill();
      g.strokeStyle = '#c98b3a'; g.lineWidth = 1.4; g.stroke();
    }, 10, '#ffc93c'),

    /* giọt sinh tố của cối xay */
    b_orb: () => bake(30, (g, r) => {
      g.beginPath(); g.arc(0, 0, r * .44, 0, TAU);
      g.fillStyle = 'rgba(210,160,255,.92)'; g.fill();
      g.strokeStyle = '#c14dff'; g.lineWidth = 2.4; g.stroke();
      g.fillStyle = 'rgba(255,255,255,.6)';
      g.beginPath(); g.arc(-r * .13, -r * .13, r * .1, 0, TAU); g.fill();
    }, 14, '#c14dff'),

    /* ============ NHẶT ĐƯỢC — NGUYÊN LIỆU ============ */

    /* hạt gia vị: muối → lá thơm → hoa hồi vàng */
    p_xp1: () => bake(20, (g, r) => {
      poly(g, 4, r * .42, Math.PI / 4);
      neon(g, '#25f4ee', 2, 'rgba(20,220,220,.85)');
    }, 10, '#25f4ee'),
    p_xp2: () => bake(24, (g, r) => {
      g.beginPath();                                            // lá thơm
      g.moveTo(0, -r * .5); g.quadraticCurveTo(r * .4, 0, 0, r * .5);
      g.quadraticCurveTo(-r * .4, 0, 0, -r * .5);
      neon(g, '#b6ff3a', 2.2, 'rgba(150,240,60,.9)');
      g.strokeStyle = 'rgba(20,60,4,.7)'; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(0, -r * .4); g.lineTo(0, r * .4); g.stroke();
    }, 12, '#b6ff3a'),
    p_xp3: () => bake(30, (g, r) => {
      star(g, 8, r * .55, r * .2);                              // hoa hồi
      neon(g, '#ffc93c', 2.4, 'rgba(255,190,60,.9)');
    }, 15, '#ffc93c'),

    p_coin: () => bake(22, (g, r) => {
      g.beginPath(); g.arc(0, 0, r * .42, 0, TAU);
      g.fillStyle = '#ffd96b'; g.fill(); g.strokeStyle = '#a86e00'; g.lineWidth = 1.6; g.stroke();
      g.fillStyle = '#a86e00'; g.font = 'bold 9px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('$', 0, .5);
    }, 11, '#ffc93c'),

    /* MIẾNG PHÔ MAI — hồi máu. Chuột mà, còn gì hợp hơn. */
    p_heart: () => bake(26, (g, r) => {
      g.beginPath();
      g.moveTo(-r * .5, r * .34); g.lineTo(r * .5, r * .34);
      g.lineTo(r * .5, -r * .06); g.lineTo(-r * .5, -r * .34);
      g.closePath();
      g.fillStyle = '#ffc93c'; g.fill();
      g.strokeStyle = '#a86e00'; g.lineWidth = 1.6; g.stroke();
      g.fillStyle = '#a86e00';                                  // các lỗ phô mai
      g.beginPath(); g.arc(-r * .18, r * .12, r * .1, 0, TAU); g.fill();
      g.beginPath(); g.arc(r * .18, r * .02, r * .07, 0, TAU); g.fill();
      g.beginPath(); g.arc(r * .04, r * .24, r * .05, 0, TAU); g.fill();
    }, 13, '#ffc93c'),

    /* CÁI VÁ — hút sạch nguyên liệu trên bản đồ */
    p_magnet: () => bake(28, (g, r) => {
      g.beginPath(); g.arc(0, r * .16, r * .34, 0, Math.PI);
      g.fillStyle = '#cfe4ff'; g.fill();
      g.strokeStyle = '#4de1ff'; g.lineWidth = 2.4; g.stroke();
      g.strokeStyle = '#4de1ff'; g.lineWidth = r * .16; g.lineCap = 'round';
      g.beginPath(); g.moveTo(0, r * .16); g.lineTo(0, -r * .5); g.stroke();
      g.strokeStyle = '#ff4d5e'; g.lineWidth = r * .1;
      g.beginPath(); g.moveTo(-r * .12, -r * .5); g.lineTo(r * .12, -r * .5); g.stroke();
    }, 13, '#4de1ff'),

    /* BÌNH CỨU HOẢ — dập sạch cả bếp */
    p_nuke: () => bake(30, (g, r) => {
      g.beginPath();
      g.moveTo(-r * .26, -r * .26); g.lineTo(r * .26, -r * .26);
      g.lineTo(r * .26, r * .5); g.lineTo(-r * .26, r * .5);
      g.closePath();
      g.fillStyle = '#c41f2e'; g.fill();
      g.strokeStyle = '#ffe23c'; g.lineWidth = 2; g.stroke();
      g.fillStyle = '#3a3f5c';                                  // cổ bình + vòi
      g.fillRect(-r * .1, -r * .5, r * .2, r * .24);
      g.strokeStyle = '#3a3f5c'; g.lineWidth = r * .1;
      g.beginPath(); g.moveTo(r * .06, -r * .44); g.lineTo(r * .4, -r * .3); g.stroke();
      g.fillStyle = '#ffe23c';                                  // nhãn
      g.beginPath(); g.arc(0, r * .12, r * .12, 0, TAU); g.fill();
    }, 15, '#ffe23c'),

    /* THÙNG NGUYÊN LIỆU — rương báu của bếp */
    p_chest: () => bake(40, (g, r) => {
      g.fillStyle = '#3a2a12'; g.strokeStyle = '#ffc93c'; g.lineWidth = 2.4;
      g.beginPath(); g.rect(-r * .5, -r * .18, r, r * .6); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(-r * .5, -r * .18); g.arc(0, -r * .18, r * .5, Math.PI, 0); g.closePath();
      g.fill(); g.stroke();
      g.fillStyle = '#ffe9a8'; g.fillRect(-r * .09, -r * .3, r * .18, r * .34);
      g.strokeStyle = 'rgba(255,201,60,.6)'; g.lineWidth = 1.6;  // nẹp thùng gỗ
      g.beginPath(); g.moveTo(-r * .28, -r * .18); g.lineTo(-r * .28, r * .42); g.stroke();
      g.beginPath(); g.moveTo(r * .28, -r * .18); g.lineTo(r * .28, r * .42); g.stroke();
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
