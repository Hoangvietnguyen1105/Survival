/* ============ NEON HORDE — procedural art, particles, fx ============ */
'use strict';

/* ================= TẦNG VẼ KIỂU TRUYỆN TRANH =================
 *
 *  Bản gốc (nhánh `main`) vẽ kiểu NEON ARCADE: hình khối hình học, tô nền tối,
 *  viền phát sáng, `shadowBlur` ở mọi nét. Nhánh này đổi hẳn sang TRUYỆN TRANH.
 *
 *  BA QUY TẮC — giữ đúng thì mọi hình vẽ thêm sau này vẫn cùng một chất:
 *    1. MÀU BẸT. Không gradient, không quầng sáng, không `shadowBlur`.
 *    2. VIỀN MỰC DÀY (`INK`) bao quanh mọi khối. Đây là thứ tạo ra cảm giác truyện tranh.
 *    3. Một VỆT SÁNG bẹt ở trên-trái, và MẶT MŨI (mắt + miệng) cho mọi thứ còn sống.
 *
 *  ⚠ `bake()` cố tình vẫn nhận 4 tham số như bản cũ (`size, fn, glow, glowColor`)
 *  nhưng BỎ QUA hai tham số quầng sáng. Nhờ vậy các hàm biểu tượng trong `data.js`
 *  và `sigils.js` gọi `bake(72, fn, 14, color)` không phải sửa chữ ký.
 * ============================================================= */

const INK = '#2a1d16';          // màu viền mực, dùng cho TẤT CẢ
const PAPER = '#fff6e2';        // màu sáng nhất, dùng làm vệt sáng và tròng mắt

function bake(size, drawFn) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.translate(size / 2, size / 2);
  g.lineJoin = 'round'; g.lineCap = 'round';
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

/** Khối truyện tranh: tô màu BẸT rồi viền mực dày. Đây là hàm dùng nhiều nhất cả file. */
function toon(g, fill, lw = 5) {
  g.fillStyle = fill; g.fill();
  g.strokeStyle = INK; g.lineWidth = lw; g.stroke();
}

/** Chỉ viền mực, không tô — dùng khi đã tô sẵn bằng gradient/ảnh khác. */
function ink(g, lw = 5) {
  g.strokeStyle = INK; g.lineWidth = lw; g.stroke();
}

/** Giữ tên cũ để các hàm biểu tượng chưa chuyển hết vẫn chạy — nay tô BẸT màu chính. */
function neon(g, color, lw = 3) { toon(g, color, Math.max(4, lw + 1.5)); }

/** Vệt sáng bẹt ở trên-trái của một khối tròn bán kính R. */
function shine(g, cx, cy, R, alpha = .5) {
  g.save();
  g.globalAlpha = alpha;
  g.fillStyle = PAPER;
  g.beginPath();
  g.ellipse(cx - R * .3, cy - R * .34, R * .34, R * .2, -.6, 0, TAU);
  g.fill();
  g.restore();
}

/** Mắt hoạt hoạ: tròng trắng + con ngươi + đốm sáng. dx = nửa khoảng cách hai mắt. */
function eyes(g, y, dx, er, angry) {
  for (const s of [-1, 1]) {
    const x = s * dx;
    g.beginPath(); g.arc(x, y, er, 0, TAU);
    toon(g, PAPER, er * .42);
    g.fillStyle = INK;
    g.beginPath(); g.arc(x + s * er * .12, y + er * .12, er * .46, 0, TAU); g.fill();
    g.fillStyle = PAPER;
    g.beginPath(); g.arc(x - s * er * .1, y - er * .3, er * .17, 0, TAU); g.fill();
    if (angry) {                       // hai hàng mày chau lại
      g.strokeStyle = INK; g.lineWidth = er * .5; g.lineCap = 'round';
      g.beginPath();
      g.moveTo(x - s * er * 1.15, y - er * 1.5);
      g.lineTo(x + s * er * .95, y - er * .9);
      g.stroke();
    }
  }
}

/** Miệng: 'smile' | 'angry' | 'o' | 'flat'. w = nửa bề rộng miệng. */
function mouth(g, y, w, kind) {
  g.strokeStyle = INK; g.lineWidth = Math.max(2.4, w * .34); g.lineCap = 'round';
  if (kind === 'o') {
    g.beginPath(); g.arc(0, y, w * .62, 0, TAU);
    g.fillStyle = INK; g.fill();
    return;
  }
  g.beginPath();
  if (kind === 'angry') { g.moveTo(-w, y + w * .42); g.lineTo(0, y - w * .18); g.lineTo(w, y + w * .42); }
  else if (kind === 'flat') { g.moveTo(-w, y); g.lineTo(w, y); }
  else { g.arc(0, y - w * .5, w, .45, Math.PI - .45); }
  g.stroke();
}

/**
 * CHUỘT ĐẦU BẾP — dùng chung cho cả 5 nhân vật, chỉ khác màu phụ kiện.
 *
 * Vẽ NHÌN TỪ TRÊN XUỐNG hơi chếch, mũi quay LÊN (-Y): `drawPlayer` xoay sprite theo
 * `p.face + PI/2`, nên đầu ở trên và đuôi ở dưới là nhân vật quay đúng hướng chạy.
 *
 * ⚠ THỨ TỰ VẼ, đừng đảo: đuôi → chân → thân → tạp dề → dụng cụ → tai → MŨ → ĐẦU → MẶT.
 *   Mũ vẽ trước đầu và lùi về sau (+Y) để không che mất mặt; mặt vẽ cuối cùng.
 *
 * o = { accent, hat, apron, band, whisk, tongs, slim }
 */
function ratChef(g, r, o) {
  const R = r * .72;
  const fur = '#9aa6ba';          // lông chuột xám — cố ý ĐỦ TỐI để cái mũ trắng nổi lên
  const skin = '#ffb3c4';         // tai, mũi, đuôi, bàn chân

  /* đuôi */
  g.strokeStyle = INK; g.lineWidth = R * .17; g.lineCap = 'round';
  g.beginPath();
  g.moveTo(0, R * .55);
  g.quadraticCurveTo(R * .42, R * .98, -R * .06, R * 1.12);
  g.stroke();
  g.strokeStyle = skin; g.lineWidth = R * .1;
  g.beginPath();
  g.moveTo(0, R * .55);
  g.quadraticCurveTo(R * .42, R * .98, -R * .06, R * 1.12);
  g.stroke();

  /* bốn bàn chân */
  for (const s of [-1, 1]) {
    g.beginPath(); g.ellipse(s * R * .46, R * .44, R * .13, R * .19, s * .5, 0, TAU);
    toon(g, skin, R * .09);
    g.beginPath(); g.ellipse(s * R * .42, -R * .02, R * .11, R * .15, s * .4, 0, TAU);
    toon(g, skin, R * .09);
  }

  /* thân */
  g.beginPath();
  g.ellipse(0, R * .2, R * (o.slim ? .38 : .47), R * .54, 0, 0, TAU);
  toon(g, fur, R * .13);
  g.beginPath();                  // bụng sáng hơn
  g.ellipse(0, R * .3, R * (o.slim ? .24 : .3), R * .34, 0, 0, TAU);
  g.fillStyle = '#ccd5e2'; g.fill();

  /* tạp dề */
  if (o.apron) {
    g.beginPath();
    g.moveTo(-R * .21, -R * .04); g.lineTo(R * .21, -R * .04);
    g.lineTo(R * .31, R * .6); g.lineTo(-R * .31, R * .6);
    g.closePath();
    toon(g, o.accent, R * .1);
    g.strokeStyle = INK; g.lineWidth = R * .06;
    g.beginPath(); g.moveTo(-R * .26, R * .28); g.lineTo(R * .26, R * .28); g.stroke();
  }

  /* dụng cụ cầm tay */
  if (o.whisk) {
    g.strokeStyle = INK; g.lineWidth = R * .13;
    g.beginPath(); g.moveTo(R * .5, R * .18); g.lineTo(R * .76, -R * .26); g.stroke();
    for (let i = -1; i <= 1; i++) {
      g.beginPath();
      g.moveTo(R * .76, -R * .26);
      g.quadraticCurveTo(R * (.92 + i * .11), -R * .48, R * .76, -R * .64);
      g.stroke();
    }
    g.strokeStyle = '#e7edf5'; g.lineWidth = R * .07;
    g.beginPath(); g.moveTo(R * .5, R * .18); g.lineTo(R * .76, -R * .26); g.stroke();
  }
  if (o.tongs) {
    g.strokeStyle = INK; g.lineWidth = R * .14;
    g.beginPath(); g.moveTo(R * .48, R * .22); g.lineTo(R * .8, -R * .3); g.stroke();
    g.beginPath(); g.moveTo(R * .48, R * .22); g.lineTo(R * .64, -R * .4); g.stroke();
    g.strokeStyle = '#e7edf5'; g.lineWidth = R * .07;
    g.beginPath(); g.moveTo(R * .48, R * .22); g.lineTo(R * .8, -R * .3); g.stroke();
  }

  /* tai — rộng ra hai bên nên luôn nhô ra ngoài vành mũ */
  for (const s of [-1, 1]) {
    g.beginPath(); g.arc(s * R * .45, -R * .36, R * .2, 0, TAU);
    toon(g, fur, R * .11);
    g.beginPath(); g.arc(s * R * .45, -R * .36, R * .11, 0, TAU);
    g.fillStyle = skin; g.fill();
  }

  /* ĐẦU — vẽ TRƯỚC mũ */
  g.beginPath(); g.arc(0, -R * .6, R * .34, 0, TAU);
  toon(g, fur, R * .12);

  /* MŨ ĐẦU BẾP — chùm phồng trắng, đội LÊN TRÊN đầu và lùi về sau (+Y).
     ⚠ Phải vẽ SAU cái đầu: vẽ trước thì đầu che kín mũ, chỉ còn thấy cái vành màu và
     con chuột trông như không đội gì (đã dính lỗi này một lần).
     Mũ lùi về sau để phần mặt phía trước (-Y) vẫn hở ra. */
  const H = R * .34 * (o.hat || 1);
  const hy = -R * .28;
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * TAU;
    g.beginPath();
    g.arc(Math.cos(a) * H * .54, hy + Math.sin(a) * H * .54, H * .48, 0, TAU);
    toon(g, '#ffffff', R * .1);
  }
  g.beginPath(); g.arc(0, hy, H * .66, 0, TAU);
  toon(g, '#ffffff', R * .11);
  g.lineCap = 'butt';
  g.beginPath();
  if (o.band) g.arc(0, hy, H * .96, .55, Math.PI - .55);
  else g.arc(0, hy, H * .96, 0, TAU);
  g.strokeStyle = o.accent; g.lineWidth = R * (o.band ? .17 : .12); g.stroke();
  g.strokeStyle = INK; g.lineWidth = R * .05; g.stroke();
  g.lineCap = 'round';

  /* MẶT — vẽ cuối cùng, nằm hẳn phía trước mũ */
  g.strokeStyle = INK; g.lineWidth = R * .05; g.lineCap = 'round';
  for (const s of [-1, 1]) {                     // ria vẽ trước để nằm dưới mõm
    g.beginPath(); g.moveTo(s * R * .16, -R * .86); g.lineTo(s * R * .66, -R * 1.0); g.stroke();
    g.beginPath(); g.moveTo(s * R * .17, -R * .8); g.lineTo(s * R * .68, -R * .78); g.stroke();
  }
  g.beginPath(); g.ellipse(0, -R * .82, R * .2, R * .17, 0, 0, TAU);
  toon(g, '#dfe6f0', R * .09);
  g.beginPath(); g.ellipse(0, -R * .91, R * .095, R * .08, 0, 0, TAU);
  g.fillStyle = skin; g.fill();
  g.strokeStyle = INK; g.lineWidth = R * .05; g.stroke();
  eyes(g, -R * .64, R * .18, R * .115, false);
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
    unknown: () => bake(32, (g, r) => { poly(g, 4, r * .6); toon(g, '#ffffff', 4); }),

    /* ============ NHÂN VẬT — CHUỘT ĐẦU BẾP ============ */
    ch_guard: () => bake(76, (g, r) => ratChef(g, r, { accent: '#ff8a3c', hat: 1.2, apron: true })),
    ch_ranger: () => bake(76, (g, r) => ratChef(g, r, { accent: '#25c9d6', hat: .85, band: true })),
    ch_mage: () => bake(76, (g, r) => ratChef(g, r, { accent: '#9d6bff', hat: 1.35, whisk: true })),
    ch_assassin: () => bake(76, (g, r) => ratChef(g, r, { accent: '#ff2e88', hat: .6, band: true, slim: true })),
    ch_engineer: () => bake(76, (g, r) => ratChef(g, r, { accent: '#7fc41f', hat: 1, apron: true, tongs: true })),

    /* ============ QUÁI — ĐỒ ĂN CÓ MẶT ============ */

    /* CÀ CHUA */
    e_grunt: () => bake(52, (g, r) => {
      g.beginPath(); g.arc(0, r * .06, r * .54, 0, TAU);
      toon(g, '#ff5252', r * .15);
      shine(g, 0, r * .06, r * .54, .4);
      g.fillStyle = '#4cc95d';                       // cuống
      star(g, 5, r * .3, r * .11, -Math.PI / 2);
      toon(g, '#4cc95d', r * .1);
      g.strokeStyle = INK; g.lineWidth = r * .1;
      g.beginPath(); g.moveTo(0, -r * .3); g.lineTo(0, -r * .52); g.stroke();
      eyes(g, r * .02, r * .19, r * .12, true);
      mouth(g, r * .32, r * .17, 'angry');
    }),

    /* CÀ RỐT */
    e_swarm: () => bake(38, (g, r) => {
      g.strokeStyle = INK; g.lineWidth = r * .14;    // lá
      for (let i = -1; i <= 1; i++) {
        g.beginPath(); g.moveTo(0, r * .3); g.lineTo(i * r * .3, r * .74); g.stroke();
      }
      g.strokeStyle = '#5cc95d'; g.lineWidth = r * .09;
      for (let i = -1; i <= 1; i++) {
        g.beginPath(); g.moveTo(0, r * .3); g.lineTo(i * r * .3, r * .74); g.stroke();
      }
      g.beginPath();
      g.moveTo(0, -r * .7); g.lineTo(r * .33, r * .34); g.lineTo(-r * .33, r * .34);
      g.closePath(); toon(g, '#ff9124', r * .14);
      g.strokeStyle = 'rgba(120,54,4,.4)'; g.lineWidth = r * .07;
      for (let i = -1; i <= 1; i++) {
        g.beginPath(); g.moveTo(-r * .17, i * r * .17); g.lineTo(r * .17, i * r * .17 - r * .04); g.stroke();
      }
      eyes(g, -r * .16, r * .14, r * .1, true);
      mouth(g, r * .1, r * .12, 'angry');
    }),

    /* BẮP CẢI TÍM — to, chậm, mặt bí xì */
    e_tank: () => bake(82, (g, r) => {
      g.beginPath(); g.arc(0, 0, r * .62, 0, TAU);
      toon(g, '#a86ff0', r * .16);
      g.strokeStyle = 'rgba(60,20,110,.45)'; g.lineWidth = r * .07;
      for (let i = 0; i < 6; i++) {                  // gân lá cuộn
        const a = i / 6 * TAU;
        g.beginPath();
        g.moveTo(Math.cos(a) * r * .14, Math.sin(a) * r * .14);
        g.quadraticCurveTo(Math.cos(a + .5) * r * .42, Math.sin(a + .5) * r * .42,
                           Math.cos(a) * r * .58, Math.sin(a) * r * .58);
        g.stroke();
      }
      shine(g, 0, 0, r * .62, .3);
      eyes(g, -r * .04, r * .22, r * .13, true);
      mouth(g, r * .3, r * .2, 'flat');
    }),

    /* CHAI XỐT — đứng xa phun xốt */
    e_shooter: () => bake(54, (g, r) => {
      g.beginPath();
      g.moveTo(-r * .3, r * .52); g.lineTo(-r * .3, -r * .08);
      g.lineTo(-r * .13, -r * .34); g.lineTo(r * .13, -r * .34);
      g.lineTo(r * .3, -r * .08); g.lineTo(r * .3, r * .52);
      g.closePath(); toon(g, '#3ec9dd', r * .14);
      g.beginPath();                                 // vòi
      g.rect(-r * .08, -r * .62, r * .16, r * .3);
      toon(g, '#ffd23f', r * .1);
      g.beginPath(); g.rect(-r * .25, r * .06, r * .5, r * .26);
      toon(g, '#fff3d6', r * .08);                   // nhãn
      eyes(g, -r * .08, r * .13, r * .095, true);
      mouth(g, r * .16, r * .11, 'o');
    }),

    /* BÔNG CẢI XANH — chết thì tách ra */
    e_splitter: () => bake(58, (g, r) => {
      g.strokeStyle = INK; g.lineWidth = r * .24;    // cọng
      g.beginPath(); g.moveTo(0, r * .56); g.lineTo(0, 0); g.stroke();
      g.strokeStyle = '#bfe8a0'; g.lineWidth = r * .15;
      g.beginPath(); g.moveTo(0, r * .56); g.lineTo(0, 0); g.stroke();
      for (let i = 0; i < 4; i++) {                  // 4 chùm hoa
        const a = -Math.PI / 2 + (i - 1.5) * .6;
        g.beginPath(); g.arc(Math.cos(a) * r * .34, Math.sin(a) * r * .34, r * .24, 0, TAU);
        toon(g, '#3ec46d', r * .12);
      }
      eyes(g, -r * .3, r * .17, r * .1, false);
      mouth(g, -r * .08, r * .13, 'smile');
    }),

    /* BẮP NGÔ — lao thẳng vào người chơi */
    e_charger: () => bake(60, (g, r) => {
      g.strokeStyle = INK; g.lineWidth = r * .16;    // lá bẹ
      for (const s of [-1, 1]) {
        g.beginPath(); g.moveTo(s * r * .2, r * .38); g.lineTo(s * r * .46, r * .7); g.stroke();
      }
      g.strokeStyle = '#7ac74f'; g.lineWidth = r * .1;
      for (const s of [-1, 1]) {
        g.beginPath(); g.moveTo(s * r * .2, r * .38); g.lineTo(s * r * .46, r * .7); g.stroke();
      }
      g.beginPath(); g.ellipse(0, 0, r * .3, r * .58, 0, 0, TAU);
      toon(g, '#ffd23f', r * .14);
      g.fillStyle = 'rgba(170,120,10,.35)';          // hạt ngô
      for (let y = -2; y <= 2; y++) {
        for (let x = -1; x <= 1; x++) {
          g.beginPath();
          g.arc(x * r * .16, y * r * .19 + (x ? r * .09 : 0), r * .06, 0, TAU); g.fill();
        }
      }
      eyes(g, -r * .28, r * .13, r * .1, true);
      mouth(g, r * .02, r * .13, 'angry');
    }),

    /* THANH LONG — chết thì nổ tung */
    e_bomber: () => bake(60, (g, r) => {
      for (let i = 0; i < 7; i++) {                  // vảy
        const a = i / 7 * TAU;
        g.save(); g.translate(Math.cos(a) * r * .5, Math.sin(a) * r * .5); g.rotate(a);
        g.beginPath();
        g.moveTo(r * .22, 0); g.lineTo(-r * .06, -r * .12); g.lineTo(-r * .06, r * .12);
        g.closePath(); toon(g, '#8ac926', r * .09);
        g.restore();
      }
      g.beginPath(); g.arc(0, 0, r * .46, 0, TAU);
      toon(g, '#ff5da2', r * .15);
      shine(g, 0, 0, r * .46, .35);
      eyes(g, -r * .06, r * .17, r * .11, true);
      mouth(g, r * .22, r * .15, 'o');
    }),

    /* ĐẬU HÀ LAN — bay vòng quanh */
    e_orbiter: () => bake(50, (g, r) => {
      g.beginPath(); g.ellipse(0, 0, r * .26, r * .58, 0, 0, TAU);
      toon(g, '#8ac926', r * .13);
      g.beginPath(); g.arc(0, r * .28, r * .13, 0, TAU);
      toon(g, '#c6e86a', r * .07);
      g.beginPath(); g.arc(0, -r * .04, r * .13, 0, TAU);
      toon(g, '#c6e86a', r * .07);
      eyes(g, -r * .34, r * .1, r * .075, false);
    }),

    /* ============ TRÙM — MÓN KHỔNG LỒ ============ */

    /* NỒI LẨU CAY */
    e_boss: () => bake(190, (g, r) => {
      g.strokeStyle = INK; g.lineWidth = r * .12;    // hai quai nồi
      g.beginPath(); g.arc(-r * .76, 0, r * .17, -1.3, 1.3); g.stroke();
      g.beginPath(); g.arc(r * .76, 0, r * .17, Math.PI - 1.3, Math.PI + 1.3); g.stroke();
      g.beginPath(); g.arc(0, 0, r * .68, 0, TAU);
      toon(g, '#5a4436', r * .11);                   // thành nồi
      g.beginPath(); g.arc(0, 0, r * .55, 0, TAU);
      toon(g, '#ff3b3b', r * .09);                   // mặt nước lẩu
      g.fillStyle = '#ff8a3c';                       // ớt và hành nổi
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * TAU + .3;
        g.save(); g.translate(Math.cos(a) * r * .4, Math.sin(a) * r * .4); g.rotate(a);
        g.beginPath(); g.ellipse(0, 0, r * .11, r * .045, 0, 0, TAU);
        toon(g, '#ff8a3c', r * .035);
        g.restore();
      }
      eyes(g, -r * .1, r * .2, r * .13, true);
      mouth(g, r * .22, r * .18, 'angry');
    }),

    /* CỐI XAY SINH TỐ */
    e_boss2: () => bake(190, (g, r) => {
      g.beginPath();                                 // thân cối
      g.moveTo(-r * .5, -r * .68); g.lineTo(-r * .38, r * .6);
      g.lineTo(r * .38, r * .6); g.lineTo(r * .5, -r * .68);
      g.closePath(); toon(g, '#c9b8f5', r * .1);
      g.beginPath();                                 // sinh tố bên trong
      g.moveTo(-r * .42, -r * .2); g.lineTo(-r * .34, r * .52);
      g.lineTo(r * .34, r * .52); g.lineTo(r * .42, -r * .2);
      g.closePath(); toon(g, '#a445e8', r * .07);
      g.beginPath(); g.ellipse(0, -r * .68, r * .5, r * .15, 0, 0, TAU);
      toon(g, '#e6dcff', r * .09);                   // miệng cối
      for (let i = 0; i < 4; i++) {                  // lưỡi dao xay
        g.save(); g.rotate(i / 4 * TAU + .4);
        g.beginPath(); g.moveTo(0, r * .3); g.lineTo(r * .34, r * .2); g.lineTo(r * .34, r * .38);
        g.closePath(); toon(g, '#dcd2f0', r * .05);
        g.restore();
      }
      eyes(g, r * .02, r * .19, r * .12, true);
      mouth(g, r * .32, r * .16, 'angry');
    }),

    /* NỒI ÁP SUẤT BẠO CHÚA */
    e_boss3: () => bake(190, (g, r) => {
      g.beginPath(); g.arc(0, 0, r * .66, 0, TAU);
      toon(g, '#c9ccd4', r * .12);                   // thân thép
      g.beginPath(); g.arc(0, 0, r * .5, 0, TAU);
      toon(g, '#ffb02e', r * .09);                   // nắp vàng
      for (let i = 0; i < 8; i++) {                  // chốt khoá quanh vành
        const a = i / 8 * TAU;
        g.beginPath(); g.arc(Math.cos(a) * r * .58, Math.sin(a) * r * .58, r * .07, 0, TAU);
        toon(g, '#8d929c', r * .05);
      }
      g.beginPath(); g.arc(0, -r * .3, r * .1, 0, TAU);
      toon(g, '#ff4d4d', r * .06);                   // van xả hơi
      eyes(g, r * .04, r * .18, r * .12, true);
      mouth(g, r * .3, r * .17, 'flat');
    }),

    /* VUA KEM ỐC QUẾ */
    e_boss4: () => bake(190, (g, r) => {
      g.beginPath();                                 // ốc quế
      g.moveTo(-r * .34, -r * .06); g.lineTo(0, r * .82); g.lineTo(r * .34, -r * .06);
      g.closePath(); toon(g, '#e0a352', r * .1);
      g.strokeStyle = 'rgba(120,72,20,.5)'; g.lineWidth = r * .045;
      for (let i = -2; i <= 2; i++) {
        g.beginPath();
        g.moveTo(-r * .3 + i * r * .05, r * .06 + Math.abs(i) * r * .13);
        g.lineTo(r * .3 + i * r * .05, r * .06 - Math.abs(i) * r * .13); g.stroke();
      }
      for (const p of [[-.3, -.3], [.3, -.3], [0, -.5]]) {   // ba viên kem
        g.beginPath(); g.arc(p[0] * r, p[1] * r, r * .27, 0, TAU);
        toon(g, '#8fe3f5', r * .1);
      }
      g.beginPath();                                 // vương miện
      g.moveTo(-r * .26, -r * .74); g.lineTo(-r * .18, -r * .92);
      g.lineTo(-r * .05, -r * .78); g.lineTo(r * .05, -r * .94);
      g.lineTo(r * .18, -r * .78); g.lineTo(r * .26, -r * .92);
      g.lineTo(r * .3, -r * .68); g.lineTo(-r * .3, -r * .68);
      g.closePath(); toon(g, '#ffd23f', r * .07);
      eyes(g, -r * .5, r * .16, r * .11, true);
      mouth(g, -r * .26, r * .15, 'angry');
    }),

    /* THẠCH GƯƠNG — hai nửa lệch nhau qua trục gương.
       ⚠ Giữ bố cục hai nửa của bản gốc: vẽ tròn trịa như mấy con kia thì giữa
       trận không phân biệt nổi với NỒI LẨU CAY. */
    e_boss5: () => bake(190, (g, r) => {
      g.save(); g.translate(-r * .14, 0);
      poly(g, 4, r * .68); toon(g, '#3ec46d', r * .1);
      g.restore();
      g.save(); g.translate(r * .14, 0);
      poly(g, 4, r * .68); toon(g, '#9dffd6', r * .1);
      g.restore();
      g.strokeStyle = INK; g.lineWidth = r * .06;    // trục gương
      g.beginPath(); g.moveTo(0, -r * .8); g.lineTo(0, r * .8); g.stroke();
      g.save(); g.globalAlpha = .55; g.fillStyle = PAPER;
      g.beginPath(); g.ellipse(-r * .34, -r * .26, r * .16, r * .07, -.7, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(r * .34, -r * .26, r * .16, r * .07, .7, 0, TAU); g.fill();
      g.restore();
      eyes(g, 0, r * .3, r * .12, true);
      mouth(g, r * .3, r * .16, 'flat');
    }),

    /* PIZZA HẮC ÁM — lõi cháy đen */
    e_boss6: () => bake(190, (g, r) => {
      g.beginPath(); g.arc(0, 0, r * .78, 0, TAU);
      toon(g, '#e0a352', r * .12);                   // viền bánh
      g.beginPath(); g.arc(0, 0, r * .62, 0, TAU);
      toon(g, '#ffc95c', r * .08);                   // phô mai
      g.strokeStyle = 'rgba(150,90,20,.35)'; g.lineWidth = r * .04;
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * TAU;
        g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * r * .62, Math.sin(a) * r * .62); g.stroke();
      }
      for (let i = 0; i < 7; i++) {                  // xúc xích
        const a = i / 7 * TAU + .4;
        g.beginPath(); g.arc(Math.cos(a) * r * .46, Math.sin(a) * r * .46, r * .09, 0, TAU);
        toon(g, '#ff4d4d', r * .05);
      }
      g.beginPath(); g.arc(0, 0, r * .3, 0, TAU);
      toon(g, '#2a1d16', r * .08);                   // lõi cháy = NHẬT THỰC
      eyes(g, -r * .02, r * .13, r * .085, true);
    }),

    /* TỔ TRỨNG CÁ */
    e_boss7: () => bake(190, (g, r) => {
      poly(g, 6, r * .76, 0); toon(g, '#8d5a3c', r * .12);
      for (let i = 0; i < 3; i++) {                  // ba ổ trứng
        const a = i / 3 * TAU - Math.PI / 2;
        g.save();
        g.translate(Math.cos(a) * r * .36, Math.sin(a) * r * .36);
        g.beginPath(); g.arc(0, 0, r * .23, 0, TAU);
        toon(g, '#ff5da2', r * .08);
        g.fillStyle = '#ff8fbd';
        for (let k = 0; k < 5; k++) {
          const b = k / 5 * TAU + i;
          g.beginPath(); g.arc(Math.cos(b) * r * .1, Math.sin(b) * r * .1, r * .055, 0, TAU); g.fill();
        }
        g.restore();
      }
      eyes(g, r * .04, r * .17, r * .11, true);
      mouth(g, r * .3, r * .15, 'angry');
    }),

    /* BÁNH KEM VÔ TẬN */
    e_boss8: () => bake(190, (g, r) => {
      for (let i = 3; i >= 1; i--) {                 // ba tầng bánh
        g.beginPath(); g.arc(0, 0, r * .24 * i, 0, TAU);
        toon(g, i % 2 ? '#fff0f6' : '#ffc6de', r * .09);
      }
      g.fillStyle = '#ff5da2';                       // kem viền quanh tầng ngoài
      for (let i = 0; i < 14; i++) {
        const a = i / 14 * TAU;
        g.beginPath(); g.arc(Math.cos(a) * r * .72, Math.sin(a) * r * .72, r * .075, 0, TAU);
        toon(g, '#ff5da2', r * .045);
      }
      g.strokeStyle = INK; g.lineWidth = r * .09;    // ngọn nến
      g.beginPath(); g.moveTo(0, r * .06); g.lineTo(0, -r * .3); g.stroke();
      g.strokeStyle = '#3ec9dd'; g.lineWidth = r * .05;
      g.beginPath(); g.moveTo(0, r * .06); g.lineTo(0, -r * .3); g.stroke();
      g.beginPath(); g.ellipse(0, -r * .4, r * .07, r * .12, 0, 0, TAU);
      toon(g, '#ffd23f', r * .05);
      eyes(g, r * .12, r * .13, r * .09, false);
      mouth(g, r * .34, r * .13, 'smile');
    }),

    /* ============ ĐẠN — NGUYÊN LIỆU BAY ============ */

    b_basic: () => bake(22, (g, r) => {              // giọt kem
      g.beginPath(); g.ellipse(0, 0, r * .58, r * .32, 0, 0, TAU);
      toon(g, '#fff6e2', r * .16);
    }),
    b_pellet: () => bake(16, (g, r) => {             // hạt tiêu
      g.beginPath(); g.arc(0, 0, r * .4, 0, TAU);
      toon(g, '#5a3a1a', r * .2);
    }),
    b_missile: () => bake(28, (g, r) => {            // xúc xích
      g.beginPath(); g.ellipse(r * .04, 0, r * .48, r * .24, 0, 0, TAU);
      toon(g, '#ff8f6b', r * .13);
      g.strokeStyle = 'rgba(120,36,14,.65)'; g.lineWidth = r * .07;
      for (let i = -1; i <= 1; i++) {
        g.beginPath(); g.moveTo(i * r * .2, -r * .16); g.lineTo(i * r * .2 + r * .08, r * .16); g.stroke();
      }
    }),
    b_bomb: () => bake(30, (g, r) => {               // nắm bột mì
      g.beginPath(); g.arc(0, 0, r * .44, 0, TAU);
      toon(g, '#f0e2c4', r * .15);
      g.fillStyle = '#ffffff';
      g.beginPath(); g.arc(-r * .13, -r * .15, r * .11, 0, TAU); g.fill();
    }),
    b_blade: () => bake(50, (g, r) => {              // dao phay
      g.beginPath();
      g.moveTo(-r * .46, -r * .3); g.lineTo(r * .5, -r * .3);
      g.lineTo(r * .5, r * .1); g.lineTo(-r * .46, r * .22);
      g.closePath(); toon(g, '#e7edf5', r * .1);
      g.beginPath(); g.rect(-r * .74, -r * .13, r * .3, r * .26);
      toon(g, '#8d5a3c', r * .1);
      g.fillStyle = '#ffffff'; g.globalAlpha = .8;
      g.fillRect(-r * .4, -r * .22, r * .84, r * .06);
      g.globalAlpha = 1;
    }),
    b_frost: () => bake(26, (g, r) => {              // viên đá
      poly(g, 4, r * .42, Math.PI / 4);
      toon(g, '#8fe3f5', r * .14);
      g.fillStyle = '#ffffff'; g.globalAlpha = .7;
      g.beginPath(); g.arc(-r * .1, -r * .1, r * .1, 0, TAU); g.fill();
      g.globalAlpha = 1;
    }),
    b_enemy: () => bake(24, (g, r) => {              // giọt xốt quái bắn
      g.beginPath(); g.arc(0, 0, r * .38, 0, TAU);
      toon(g, '#ff5da2', r * .15);
    }),
    b_shard: () => bake(24, (g, r) => {              // vụn bánh
      g.beginPath(); g.moveTo(r * .48, -r * .08); g.lineTo(r * .04, -r * .28);
      g.lineTo(-r * .4, 0); g.lineTo(r * .02, r * .28);
      g.closePath(); toon(g, '#ffd23f', r * .13);
    }),
    b_orb: () => bake(34, (g, r) => {                // giọt sinh tố
      g.beginPath(); g.arc(0, 0, r * .4, 0, TAU);
      toon(g, '#a445e8', r * .14);
      g.fillStyle = '#ffffff'; g.globalAlpha = .55;
      g.beginPath(); g.arc(-r * .11, -r * .11, r * .1, 0, TAU); g.fill();
      g.globalAlpha = 1;
    }),

    /* ============ NHẶT ĐƯỢC ============ */

    p_xp1: () => bake(22, (g, r) => {                // hạt muối
      poly(g, 4, r * .38, Math.PI / 4); toon(g, '#7fe3f0', r * .14);
    }),
    p_xp2: () => bake(26, (g, r) => {                // lá thơm
      g.beginPath();
      g.moveTo(0, -r * .46); g.quadraticCurveTo(r * .38, 0, 0, r * .46);
      g.quadraticCurveTo(-r * .38, 0, 0, -r * .46);
      toon(g, '#8ac926', r * .13);
      g.strokeStyle = INK; g.lineWidth = r * .06;
      g.beginPath(); g.moveTo(0, -r * .36); g.lineTo(0, r * .36); g.stroke();
    }),
    p_xp3: () => bake(32, (g, r) => {                // hoa hồi
      star(g, 8, r * .5, r * .2); toon(g, '#ffd23f', r * .12);
    }),
    p_coin: () => bake(26, (g, r) => {
      g.beginPath(); g.arc(0, 0, r * .4, 0, TAU);
      toon(g, '#ffd23f', r * .14);
      g.fillStyle = INK; g.font = 'bold ' + Math.round(r * .46) + 'px sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('$', 0, r * .02);
    }),
    /* MIẾNG PHÔ MAI — hồi máu. Chuột mà, còn gì hợp hơn. */
    p_heart: () => bake(30, (g, r) => {
      g.beginPath();
      g.moveTo(-r * .48, r * .3); g.lineTo(r * .48, r * .3);
      g.lineTo(r * .48, -r * .06); g.lineTo(-r * .48, -r * .32);
      g.closePath(); toon(g, '#ffd23f', r * .13);
      g.fillStyle = '#c98b1a';
      for (const p of [[-.18, .1, .1], [.18, 0, .07], [.04, .2, .05]]) {
        g.beginPath(); g.arc(p[0] * r, p[1] * r, p[2] * r, 0, TAU); g.fill();
      }
    }),
    /* CÁI VÁ — hút sạch nguyên liệu */
    p_magnet: () => bake(32, (g, r) => {
      g.strokeStyle = INK; g.lineWidth = r * .2;
      g.beginPath(); g.moveTo(0, r * .18); g.lineTo(0, -r * .48); g.stroke();
      g.strokeStyle = '#c9ccd4'; g.lineWidth = r * .1;
      g.beginPath(); g.moveTo(0, r * .18); g.lineTo(0, -r * .48); g.stroke();
      g.beginPath(); g.arc(0, r * .2, r * .32, 0, Math.PI);
      toon(g, '#3ec9dd', r * .12);
    }),
    /* BÌNH CỨU HOẢ — dập sạch cả bếp */
    p_nuke: () => bake(34, (g, r) => {
      g.beginPath(); g.rect(-r * .24, -r * .24, r * .48, r * .66);
      toon(g, '#e02b3c', r * .13);
      g.beginPath(); g.rect(-r * .09, -r * .46, r * .18, r * .22);
      toon(g, '#5a5f6b', r * .09);
      g.strokeStyle = INK; g.lineWidth = r * .1;
      g.beginPath(); g.moveTo(r * .05, -r * .4); g.lineTo(r * .34, -r * .26); g.stroke();
      g.beginPath(); g.arc(0, r * .1, r * .11, 0, TAU);
      toon(g, '#ffd23f', r * .07);
    }),
    /* THÙNG NGUYÊN LIỆU */
    p_chest: () => bake(44, (g, r) => {
      g.beginPath(); g.rect(-r * .48, -r * .16, r * .96, r * .56);
      toon(g, '#8d5a3c', r * .12);
      g.beginPath(); g.moveTo(-r * .48, -r * .16); g.arc(0, -r * .16, r * .48, Math.PI, 0); g.closePath();
      toon(g, '#a86a44', r * .12);
      g.beginPath(); g.rect(-r * .1, -r * .3, r * .2, r * .34);
      toon(g, '#ffd23f', r * .1);
      g.strokeStyle = INK; g.lineWidth = r * .07;
      for (const s of [-1, 1]) {
        g.beginPath(); g.moveTo(s * r * .27, -r * .16); g.lineTo(s * r * .27, r * .4); g.stroke();
      }
    }),

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

  /**
   * Hạt kiểu TRUYỆN TRANH: đốm màu BẸT có viền mực, không cộng sáng.
   * Bản gốc (`main`) vẽ quầng sáng cộng dồn (`lighter`) + lõi trắng — trên nền kem
   * sáng của nhánh này thì cộng sáng làm hạt biến mất hẳn, nên phải đổi cách vẽ.
   */
  draw(g) {
    const a = this.pool.active;
    g.save();
    for (let i = 0; i < a.length; i++) {
      const p = a[i];
      const t = p.life / p.maxLife;
      if (p.type === 'ring') {
        const r = lerp(p.size, p.size2, 1 - t);
        g.globalAlpha = t;
        g.strokeStyle = INK; g.lineWidth = (p.vx * t + .6) + 2.6;
        g.beginPath(); g.arc(p.x, p.y, r, 0, TAU); g.stroke();
        g.strokeStyle = p.color; g.lineWidth = p.vx * t + .6;
        g.beginPath(); g.arc(p.x, p.y, r, 0, TAU); g.stroke();
        continue;
      }
      if (p.type === 'smoke') {
        const s = lerp(p.size, p.size2, 1 - t);
        g.globalAlpha = t * .45;
        g.fillStyle = p.color;
        g.beginPath(); g.arc(p.x, p.y, s, 0, TAU); g.fill();
        continue;
      }
      const s = p.size * (p.size2 ? lerp(1, p.size2 / p.size, 1 - t) : t);
      g.globalAlpha = Math.min(1, t * 1.5);
      g.beginPath(); g.arc(p.x, p.y, s * .95, 0, TAU);
      g.fillStyle = p.color; g.fill();
      // chỉ viền mực cho hạt TO: hạt nhỏ (vệt đạn) mà viền hết thì vệt thành sợi dây đặc
      if (s > 3.2) { g.strokeStyle = INK; g.lineWidth = Math.max(1, s * .26); g.stroke(); }
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
      g.lineWidth = 5; g.strokeStyle = INK;
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
