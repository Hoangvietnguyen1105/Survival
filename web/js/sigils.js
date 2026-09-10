/* ============ NEON KITCHEN — BÍ KÍP (buff 4 tầng) ============
 *
 *  Khác đồ nghề bị động: mỗi Bí Kíp có 4 tầng, và TẦNG 4 BỊ KHOÁ sau một
 *  ngưỡng chỉ số. Mỗi Bí Kíp tự cộng một ít đúng loại chỉ số nó cần, nhưng
 *  KHÔNG BAO GIỜ đủ một mình — bạn phải chủ động chọn đồ nghề tương ứng.
 *  => Chọn chỉ số gì sẽ quyết định mở được tầng cuối của Bí Kíp nào.
 *
 *  Tầng 4 của mỗi Bí Kíp là một pha "wow" hẳn, không phải cộng thêm vài %.
 * ============================================================ */
'use strict';

const SIGILS = {

  /* ================= 1. ẤN LÔI ĐÌNH ================= */
  thunder: {
    name: 'BÍ KÍP LÒ VI SÓNG', color: '#9d6bff', max: 4,
    tip: 'Cứ vài đòn lại phóng ra một tia điện.',
    req: { key: 'haste', min: 1.5, label: 'Tốc đánh ≥ 150%' },
    awName: 'BÃO VI SÓNG',
    apply: (s, lv) => { s.haste += .05 * lv; },
    desc: lv => [
      'Cứ <em>8</em> đòn đánh phóng 1 tia sét',
      'Cứ <em>6</em> đòn · sét lan <em>3</em> mục tiêu',
      'Cứ <em>5</em> đòn · lan <em>4</em> · làm <em>choáng</em>',
      'Cứ <em>4</em> đòn · lan <em>12</em> mục tiêu · sét chuyển <em>trắng–vàng</em> và <em>MẠNH DẦN +18%</em> sau mỗi lần nảy'
    ][lv - 1],
    icon(g, r) {                                  // cửa lò vi sóng + tia điện
      g.beginPath(); g.rect(-r * .8, -r * .6, r * 1.6, r * 1.2);
      toon(g, '#8b7fb0', r * .11);
      g.beginPath(); g.rect(-r * .66, -r * .46, r * 1.06, r * .92);
      toon(g, '#6b3fd4', r * .08);                  // cửa kính
      g.strokeStyle = INK; g.lineWidth = r * .05;
      for (let i = -1; i <= 1; i++) {               // lưới cửa lò
        g.beginPath(); g.moveTo(i * r * .28 - r * .12, -r * .46); g.lineTo(i * r * .28 - r * .12, r * .46); g.stroke();
      }
      g.beginPath(); g.rect(r * .48, -r * .34, r * .24, r * .68);
      toon(g, '#c9ccd4', r * .07);                  // bảng nút
      g.beginPath();                                // tia điện
      g.moveTo(r * .06, -r * .42); g.lineTo(-r * .34, r * .04); g.lineTo(-r * .06, r * .04);
      g.lineTo(-r * .2, r * .46); g.lineTo(r * .26, -r * .08); g.lineTo(-r * .02, -r * .08);
      g.closePath(); toon(g, '#ffd23f', r * .08);
    },
    /* Hàng rào thời gian của onHit — xem chú thích ngay dưới. */
    tick(G, st, dt) { if (st.cd > 0) st.cd -= dt; },

    onHit(G, st, e) {
      /* ⚠️ onHit chạy MỖI LẦN MỘT CON quái ăn đòn, không phải mỗi lần bắn. Một vụ nổ diện
         rộng trúng 40 con sẽ nạp đủ bộ đếm 6-7 lần trong CÙNG MỘT khung hình → Ấn này càng
         mạnh đúng lúc quái càng đông. Đo ở màn 30 với 260 con: 31 tia/giây, sát thương gấp
         khoảng 200 LẦN chính khẩu súng đang cầm.
         Bộ đếm giữ nguyên cho cảm giác "cứ vài đòn lại có sét", nhưng phải qua thêm hàng
         rào thời gian này. Cùng loại bệnh với trần hồi máu (CLAUDE.md mục 5B / bẫy số 10). */
      if (st.cd > 0) return;
      const every = [8, 6, 5, 6][st.lv - 1];
      if (++st.n < every) return;
      st.n = 0;
      st.cd = [.8, .65, .55, .45][st.lv - 1];
      const aw = st.lv >= 4;
      Sigils.chain(G, e, [1, 3, 4, 6][st.lv - 1],
        (24 + G.wave * 4.5) * G.stats.damage, {
        growth: aw ? 1.05 : .88,
        stun: st.lv >= 3 ? .35 : 0,
        awakened: aw
      });
      Sfx.shoot('lightning');
    }
  },

  /* ================= 2. ẤN HUYẾT NGUYỆT ================= */
  bloodmoon: {
    name: 'BÍ KÍP DAO THỚT', color: '#ff2e88', max: 4,
    tip: 'Món nào sắp tàn thì một nhát là xong.',
    req: { key: 'lifesteal', min: .05, label: 'Hút máu ≥ 5%' },
    awName: 'HẠ DAO',
    apply: (s, lv) => { s.lifesteal += .008 * lv; },
    desc: lv => [
      'Hút máu <em>+0.8%</em> mỗi tầng',
      'Sát thương <em>+35%</em> lên kẻ địch dưới <em>25%</em> máu',
      'Mỗi lần hạ gục hồi <em>2</em> máu',
      '<em>HÀNH QUYẾT</em> tức thì mọi kẻ địch dưới <em>25%</em> máu — mỗi xác nổ thành <em>sóng máu</em> lan sang xung quanh'
    ][lv - 1],
    icon(g, r) {                                  // cái thớt gỗ + dao phay cắm xuống
      g.beginPath(); g.rect(-r * .76, -r * .28, r * 1.52, r * .9);
      toon(g, '#c98b3a', r * .11);
      g.strokeStyle = INK; g.lineWidth = r * .05;
      for (let i = -1; i <= 1; i++) {               // thớ gỗ
        g.beginPath(); g.moveTo(-r * .7, i * r * .22 + r * .18); g.lineTo(r * .7, i * r * .22 + r * .18); g.stroke();
      }
      g.save(); g.rotate(.38);                      // lưỡi dao
      g.beginPath(); g.rect(-r * .32, -r * .8, r * .66, r * .52);
      toon(g, '#e7edf5', r * .1);
      g.beginPath(); g.rect(r * .32, -r * .72, r * .36, r * .2);
      toon(g, '#8d5a3c', r * .09);                  // cán dao
      g.restore();
    },
    dmgMul(G, st, e) {
      return (st.lv >= 2 && e.hp / e.maxHp < .25) ? 1.35 : 1;
    },
    onKill(G, st, e) {
      if (st.lv < 3) return;
      const p = G.player;
      // Phải rút từ hũ hồi máu có trần của G, nếu không thì cuối game hạ ~100 mạng/giây
      // là hồi 200 máu/giây trên bể máu 210 -> bất tử. Xem G.HEAL_CAP.
      const heal = Math.min(2, G.healPool);
      if (heal > 0 && p.hp < p.maxHp) { G.healPool -= heal; p.hp = Math.min(p.maxHp, p.hp + heal); }
    },
    afterHit(G, st, e) {
      if (st.lv < 4 || e.dead || e.boss) return;
      if (e.hp / e.maxHp >= .12) return;
      Sigils.execute(G, e);
    }
  },

  /* ================= 3. ẤN BĂNG TINH ================= */
  frost: {
    name: 'BÍ KÍP TỦ ĐÔNG', color: '#6fe6ff', max: 4,
    tip: 'Làm lạnh, rồi đập vỡ cái gì đã đông.',
    req: { key: 'area', min: 1.5, label: 'Phạm vi ≥ 150%' },
    awName: 'ĐÔNG ĐÁ TOÀN BẾP',
    apply: (s, lv) => { s.area += .06 * lv; },
    desc: lv => [
      '<em>18%</em> đòn đánh làm chậm <em>25%</em>',
      'Kẻ địch đang bị chậm nhận thêm <em>25%</em> sát thương',
      'Kẻ địch chết khi đang chậm sẽ <em>nổ băng</em>',
      'Cứ <em>11 giây</em> <em>ĐÓNG BĂNG TOÀN MÀN HÌNH</em> 2 giây — xác đóng băng <em>vỡ tan</em> thành mảnh băng xuyên thấu'
    ][lv - 1],
    icon(g, r) {                                  // cánh tủ đông + bông tuyết
      g.beginPath(); g.rect(-r * .62, -r * .82, r * 1.24, r * 1.64);
      toon(g, '#c9ccd4', r * .11);
      g.beginPath(); g.rect(-r * .48, -r * .68, r * .96, r * .48);
      toon(g, '#8fe3f5', r * .08);                  // ngăn đá
      g.beginPath(); g.rect(-r * .48, -r * .04, r * .96, r * .72);
      toon(g, '#8fe3f5', r * .08);                  // ngăn mát
      g.strokeStyle = INK; g.lineWidth = r * .12; g.lineCap = 'round';
      g.beginPath(); g.moveTo(r * .3, -r * .58); g.lineTo(r * .3, -r * .32); g.stroke();
      g.beginPath(); g.moveTo(r * .3, r * .1); g.lineTo(r * .3, r * .42); g.stroke();
      g.strokeStyle = INK; g.lineWidth = r * .1;     // bông tuyết
      for (let i = 0; i < 3; i++) {
        const a = i / 3 * Math.PI;
        g.beginPath();
        g.moveTo(-r * .16 - Math.cos(a) * r * .2, r * .3 - Math.sin(a) * r * .2);
        g.lineTo(-r * .16 + Math.cos(a) * r * .2, r * .3 + Math.sin(a) * r * .2);
        g.stroke();
      }
      g.strokeStyle = '#fff6e2'; g.lineWidth = r * .05;
      for (let i = 0; i < 3; i++) {
        const a = i / 3 * Math.PI;
        g.beginPath();
        g.moveTo(-r * .16 - Math.cos(a) * r * .2, r * .3 - Math.sin(a) * r * .2);
        g.lineTo(-r * .16 + Math.cos(a) * r * .2, r * .3 + Math.sin(a) * r * .2);
        g.stroke();
      }
    },
    dmgMul(G, st, e) { return (st.lv >= 2 && e.slowAmt > .02) ? 1.25 : 1; },
    onHit(G, st, e) {
      if (Math.random() < .18) {
        e.slowAmt = Math.max(e.slowAmt, .25);
        e.slowT = Math.max(e.slowT, 1.5);
      }
    },
    onKill(G, st, e) {
      if (st.lv >= 3 && (e.slowAmt > .02 || e.frozen)) {
        Particles.ring(e.x, e.y, 70 * G.stats.area, '#aef3ff', .35, 4);
        for (const o of G.enemiesInRadius(e.x, e.y, 70 * G.stats.area))
          G.damageEnemy(o, (7 + G.wave * 1.1) * G.stats.damage, { silent: true, sigil: true });
      }
      if (st.lv >= 4 && e.frozen) Sigils.shatter(G, e);
    },
    tick(G, st, dt) {
      if (st.lv < 4) return;
      st.t -= dt;
      if (st.t <= 0) { st.t = 20; Sigils.freezeAll(G); }
    }
  },

  /* ================= 4. ẤN HƯ KHÔNG ================= */
  void: {
    name: 'BÍ KÍP CỐI XAY', color: '#c14dff', max: 4,
    tip: 'Cối xay hút nguyên liệu, rồi hút cả món ăn.',
    req: { key: 'pickup', min: 250, label: 'Tầm hút ≥ 250' },
    awName: 'CỐI XAY VŨ TRỤ',
    apply: (s, lv) => { s.pickup += 30 * lv; },
    desc: lv => [
      'Tầm hút vật phẩm <em>+30</em> mỗi tầng',
      'Cứ <em>12 giây</em> mở một <em>lỗ đen</em> hút kẻ địch',
      'Lỗ đen <em>nghiền</em> kẻ địch bên trong',
      '<em>HỐ ĐEN KHỔNG LỒ</em> nuốt cả màn hình, khi tan thì <em>NỔ SIÊU TÂN TINH</em> và hút sạch ngọc toàn bản đồ'
    ][lv - 1],
    icon(g, r) {                                  // cối xay: thân cối + lưỡi dao
      g.beginPath();
      g.moveTo(-r * .56, -r * .7); g.lineTo(-r * .42, r * .7);
      g.lineTo(r * .42, r * .7); g.lineTo(r * .56, -r * .7);
      g.closePath(); toon(g, '#c9b8f5', r * .11);
      g.beginPath();
      g.moveTo(-r * .48, -r * .22); g.lineTo(-r * .36, r * .6);
      g.lineTo(r * .36, r * .6); g.lineTo(r * .48, -r * .22);
      g.closePath(); toon(g, '#a445e8', r * .08);     // sinh tố
      g.beginPath(); g.ellipse(0, -r * .7, r * .56, r * .17, 0, 0, TAU);
      toon(g, '#e6dcff', r * .1);                     // miệng cối
      for (let i = 0; i < 4; i++) {                   // lưỡi dao xay
        g.save(); g.rotate(i / 4 * TAU + .4);
        g.beginPath(); g.moveTo(0, r * .28); g.lineTo(r * .34, r * .18); g.lineTo(r * .34, r * .38);
        g.closePath(); toon(g, '#e7edf5', r * .06);
        g.restore();
      }
    },
    tick(G, st, dt) {
      if (st.lv < 2) return;
      st.t -= dt;
      if (st.t > 0) return;
      const aw = st.lv >= 4;
      st.t = aw ? 14 : 12;
      const tgt = G.randomEnemyNear(G.player.x, G.player.y, 420) || G.player;
      Sigils.blackHole(G, tgt.x, tgt.y, {
        r: aw ? 200 : (st.lv >= 3 ? 145 : 115),
        life: aw ? 2.6 : 2.6,
        dps: st.lv >= 3 ? (6 + G.wave * .9) * G.stats.damage : 0,
        big: aw
      });
    }
  },

  /* ================= 5. ẤN PHƯỢNG HOÀNG ================= */
  phoenix: {
    name: 'BÍ KÍP MEN NỞ', color: '#ff8a3c', max: 4,
    tip: 'Càng gần chết càng mạnh — và chết rồi vẫn đứng dậy.',
    req: { key: 'maxHp', min: 200, label: 'Máu tối đa ≥ 200' },
    awName: 'TÁI SINH TỪ TRO TÀN',
    apply: (s, lv) => { s.maxHp += 18 * lv; },
    desc: lv => [
      'Máu tối đa <em>+18</em> mỗi tầng · lướt để lại <em>vệt lửa</em>',
      'Vệt lửa <em>thiêu đốt</em> kẻ địch đi qua',
      'Dưới <em>35%</em> máu: <em>+35%</em> tốc chạy, <em>+25%</em> sát thương',
      '<em>TÁI SINH</em>: lần đầu gục ngã sẽ sống lại với <em>60%</em> máu, <em>thiêu rụi</em> toàn màn hình và bất tử <em>3 giây</em>'
    ][lv - 1],
    icon(g, r) {                                  // ổ bánh nở bung trong lửa
      for (let i = -1; i <= 1; i++) {               // ngọn lửa dưới đáy
        g.beginPath();
        g.moveTo(i * r * .34 - r * .12, r * .76);
        g.quadraticCurveTo(i * r * .34 + r * .22, r * .34, i * r * .34, r * .02);
        g.quadraticCurveTo(i * r * .34 - r * .2, r * .34, i * r * .34 - r * .12, r * .76);
        g.closePath(); toon(g, '#ff8a3c', r * .08);
      }
      g.beginPath();                                // ổ bánh phồng
      g.moveTo(-r * .64, r * .16);
      g.bezierCurveTo(-r * .64, -r * .8, r * .64, -r * .8, r * .64, r * .16);
      g.closePath(); toon(g, '#e0a352', r * .12);
      g.strokeStyle = INK; g.lineWidth = r * .09; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-r * .28, -r * .2); g.lineTo(r * .02, -r * .5); g.stroke();
      g.beginPath(); g.moveTo(r * .1, -r * .16); g.lineTo(r * .4, -r * .4); g.stroke();
    },
    tick(G, st, dt) {
      const p = G.player;
      // cơn thịnh nộ khi sắp chết
      G.rage = st.lv >= 3 && p.hp / p.maxHp < .35;
      // vệt lửa khi lướt
      if (p.dashT > 0) {
        Particles.emit({
          x: p.x + rand(-9, 9), y: p.y + rand(-9, 9),
          vx: rand(-30, 30), vy: rand(-50, -10),
          life: .5, size: 6, color: pick(['#ff8a3c', '#ffc93c', '#ff4d5e']), drag: .92
        });
        if (st.lv >= 2) Sigils.flame(G, p.x, p.y, (6 + G.wave * .9) * G.stats.damage);
      }
    }
  }
};

/* register icons */
for (const id in SIGILS) {
  const s = SIGILS[id];
  Art.build['s_' + id] = () => bake(72, (g, r) => s.icon(g, r * .82), 15, s.color);
}

/* ================================================================
 *  Bộ điều phối: gọi hook, giữ trạng thái hiệu ứng của Ấn Ký
 * ================================================================ */
const Sigils = {
  holes: [],
  flames: [],
  freezeT: 0,
  flashT: 0,
  execN: 0,          // đếm số lần HÀNH QUYẾT — xem execute()

  reset() {
    this.holes.length = 0;
    this.flames.length = 0;
    this.freezeT = 0;
    this.flashT = 0;
    this.execN = 0;
  },

  /** Đã đủ chỉ số để mở tầng cuối chưa? */
  reqMet(G, def) { return G.stats[def.req.key] >= def.req.min; },

  /** Giá trị hiện tại của chỉ số điều kiện, dạng chữ để hiện lên thẻ bài. */
  reqNow(G, def) {
    const v = G.stats[def.req.key];
    switch (def.req.key) {
      case 'haste': case 'area': return Math.round(v * 100) + '%';
      case 'lifesteal': return (v * 100).toFixed(1) + '%';
      default: return Math.round(v);
    }
  },

  /* ---------------- hook ---------------- */
  dmgMul(G, e) {
    let m = G.rage ? 1.25 : 1;
    for (const s of G.sigils) {
      const d = SIGILS[s.id];
      if (d.dmgMul) m *= d.dmgMul(G, s, e);
    }
    return m;
  },

  onHit(G, e) {
    for (const s of G.sigils) {
      const d = SIGILS[s.id];
      if (d.onHit) d.onHit(G, s, e);
    }
  },

  afterHit(G, e) {
    for (const s of G.sigils) {
      const d = SIGILS[s.id];
      if (d.afterHit) d.afterHit(G, s, e);
    }
  },

  onKill(G, e) {
    for (const s of G.sigils) {
      const d = SIGILS[s.id];
      if (d.onKill) d.onKill(G, s, e);
    }
  },

  /** Trả về true nếu đã cứu người chơi khỏi cái chết. */
  onLethal(G) {
    const s = G.sigils.find(x => x.id === 'phoenix' && x.lv >= 4 && !x.used);
    if (!s) return false;
    s.used = true;
    const p = G.player;
    p.hp = p.maxHp * .35;
    p.iframe = 1.5;
    G.rage = false;

    Cam.addShake(12);
    Cam.doFlash('#ffb02e', .5);
    G.slowmoT = 1.2;
    UI.announce('TÁI SINH!', '#ff8a3c');
    Sfx.chest(); Sfx.explode(true);
    Particles.shockwave(p.x, p.y, 380, '#ff8a3c');
    for (let i = 0; i < 35; i++) {
      const a = rand(TAU);
      Particles.emit({
        x: p.x, y: p.y, vx: Math.cos(a) * rand(200, 800), vy: Math.sin(a) * rand(200, 800),
        life: rand(.6, 1.3), size: rand(5, 11),
        color: pick(['#ff8a3c', '#ffc93c', '#ff4d5e', '#fff2c4']), drag: .93
      });
    }
    for (const en of G.enemies.active.slice()) {
      if (en.dead) continue;
      if (en.boss) { G.damageEnemy(en, 220 * G.stats.damage, { sigil: true }); continue; }
      G.damageEnemy(en, (60 + G.wave * 14) * G.stats.damage, { sigil: true });
    }
    return true;
  },

  update(G, dt) {
    for (const s of G.sigils) {
      const d = SIGILS[s.id];
      if (d.tick) d.tick(G, s, dt);
    }

    if (this.freezeT > 0) this.freezeT -= dt;
    if (this.flashT > 0) this.flashT -= dt;

    /* ---- lỗ đen ---- */
    for (let i = this.holes.length - 1; i >= 0; i--) {
      const h = this.holes[i];
      h.life -= dt;
      h.spin += dt * 3.2;
      if (h.life <= 0) {
        if (h.big) this.supernova(G, h);
        this.holes.splice(i, 1);
        continue;
      }
      h.dmgT -= dt;
      const hit = G.enemiesInRadius(h.x, h.y, h.r);
      for (const e of hit) {
        if (e.boss) continue;
        const a = angleTo(e.x, e.y, h.x, h.y);
        const d = dist(e.x, e.y, h.x, h.y);
        const pull = (h.big ? 520 : 300) * (1 - d / h.r * .5);
        e.x += Math.cos(a) * pull * dt;
        e.y += Math.sin(a) * pull * dt;
        if (h.dps > 0 && h.dmgT <= 0)
          G.damageEnemy(e, h.dps * .25, { silent: true, sigil: true });
      }
      if (h.dmgT <= 0) h.dmgT = .25;

      if (Math.random() < dt * 40) {
        const a = rand(TAU);
        Particles.emit({
          x: h.x + Math.cos(a) * h.r, y: h.y + Math.sin(a) * h.r,
          vx: -Math.cos(a) * h.r * 1.6, vy: -Math.sin(a) * h.r * 1.6,
          life: .55, size: 5, color: '#c14dff', drag: .95
        });
      }
    }

    /* ---- vũng lửa ---- */
    for (let i = this.flames.length - 1; i >= 0; i--) {
      const f = this.flames[i];
      f.life -= dt;
      if (f.life <= 0) { this.flames.splice(i, 1); continue; }
      f.dmgT -= dt;
      if (f.dmgT <= 0) {
        f.dmgT = .3;
        for (const e of G.enemiesInRadius(f.x, f.y, f.r))
          G.damageEnemy(e, f.dps * .3, { silent: true, sigil: true });
      }
      if (Math.random() < dt * 14)
        Particles.emit({
          x: f.x + rand(-f.r, f.r) * .6, y: f.y + rand(-f.r, f.r) * .6,
          vx: rand(-14, 14), vy: rand(-46, -14), life: .5, size: 5,
          color: pick(['#ff8a3c', '#ffc93c']), drag: .93
        });
    }
  },

  /* ---------------- hiệu ứng ---------------- */

  /** Sét lan truyền, có thể MẠNH DẦN thay vì yếu dần (tầng thức tỉnh). */
  chain(G, first, count, dmg, opt) {
    let cur = first, px = G.player.x, py = G.player.y, d = dmg;
    const seen = new Set();
    for (let i = 0; i < count && cur; i++) {
      seen.add(cur.uid);
      const col = opt.awakened
        ? (i < 2 ? '#c9a8ff' : i < 5 ? '#ffffff' : '#ffe23c')
        : '#c9a8ff';
      G.arcs.push({ x1: px, y1: py, x2: cur.x, y2: cur.y, life: .3, maxLife: .3, seed: rand(1000), color: col });
      G.damageEnemy(cur, d, { knock: 40, sigil: true });
      if (opt.stun) cur.stunT = Math.max(cur.stunT, opt.stun);
      Particles.burst(cur.x, cur.y, opt.awakened ? 6 : 4, col, { speed: 230, life: .3, size: 4 });
      d *= opt.growth;
      px = cur.x; py = cur.y;

      let best = null, bd = (opt.awakened ? 330 : 240) ** 2;
      for (const e of G.enemiesInRadius(px, py, opt.awakened ? 330 : 240)) {
        if (seen.has(e.uid)) continue;
        const dd = dist2(px, py, e.x, e.y);
        if (dd < bd) { bd = dd; best = e; }
      }
      cur = best;
    }
    if (opt.awakened) { Cam.addShake(2); Cam.doFlash('#ffe23c', .15); }
  },

  /** Hành quyết: giết ngay và bắn ra sóng máu. */
  execute(G, e) {
    /* ⚠️ Số lần HÀNH QUYẾT mỗi giây tỉ lệ thuận với SỐ QUÁI ĐANG ĐÔNG. Nếu mỗi lần đều
       nổ một sóng máu diện rộng thì riêng Ấn này đã gấp ~50 lần khẩu súng đang cầm
       (đo ở màn 30, 260 con: 23 283 dps so với 434). Đòn hành quyết giữ nguyên — đó mới
       là thứ người chơi mua — nhưng SÓNG MÁU chỉ nổ ở mỗi lần thứ 4.
       Cùng loại bệnh với ẤN LÔI ĐÌNH và trần hồi máu: xem CLAUDE.md bẫy số 10. */
    const boom = (++this.execN % 4) === 0;
    FloatText.add(e.x, e.y - 20, 'HÀNH QUYẾT', '#ff2e88', 17);
    if (boom) {
      const wave = (10 + G.wave * 1.8) * G.stats.damage;
      Particles.shockwave(e.x, e.y, 90, '#ff2e88');
      Particles.burst(e.x, e.y, 10, '#ff2e88', { speed: 280, life: .45, size: 5 });
      Sfx.explode(false);
      this.flashT = .09;
      for (const o of G.enemiesInRadius(e.x, e.y, 130)) {
        if (o === e) continue;
        G.damageEnemy(o, wave, { knock: 160, ang: angleTo(e.x, e.y, o.x, o.y), sigil: true });
      }
    } else {
      Particles.burst(e.x, e.y, 4, '#ff2e88', { speed: 200, life: .3, size: 4 });
    }
    G.damageEnemy(e, 99999, { silent: true, sigil: true });
  },

  /** Đóng băng toàn màn hình. */
  freezeAll(G) {
    this.freezeT = 2;
    UI.announce('ĐÓNG BĂNG!', '#aef3ff');
    Sfx.shoot('frost');
    Cam.doFlash('#aef3ff', .28);
    Cam.addShake(3);
    Particles.shockwave(G.player.x, G.player.y, 480, '#aef3ff');
    for (const e of G.enemies.active) {
      if (e.dead || e.boss) continue;
      e.stunT = Math.max(e.stunT, 2);
      e.slowAmt = 1; e.slowT = Math.max(e.slowT, 2.2);
      e.frozen = true;
    }
    G.after(2.2, () => { for (const e of G.enemies.active) e.frozen = false; });
  },

  /** Xác đóng băng vỡ thành mảnh băng xuyên thấu. */
  shatter(G, e) {
    Sfx.hit(true);
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * TAU + rand(.3);
      G.spawnBullet({
        x: e.x, y: e.y, a, spd: 520,
        dmg: (8 + G.wave * 1.2) * G.stats.damage,
        sprite: 'b_frost', color: '#aef3ff',
        r: 9 * G.stats.area, life: .8, pierce: 3,
        scale: G.stats.area, spin: 12, slow: .3
      });
    }
    Particles.burst(e.x, e.y, 8, '#aef3ff', { speed: 250, life: .35, size: 4 });
  },

  blackHole(G, x, y, o) {
    this.holes.push({
      x, y, r: o.r * G.stats.area, life: o.life, maxLife: o.life,
      dps: o.dps, dmgT: 0, big: o.big, spin: 0
    });
    Particles.ring(x, y, o.r * G.stats.area, '#c14dff', .5, 5);
    Sfx.shoot('frost');
    if (o.big) {
      UI.announce('HỐ ĐEN!', '#c14dff');
      Cam.addShake(4);
    }
  },

  supernova(G, h) {
    Cam.addShake(10);
    Cam.doFlash('#ffffff', .45);
    Sfx.explode(true);
    UI.announce('SIÊU TÂN TINH!', '#ffffff');
    G.explode(h.x, h.y, h.r * 1.2, (58 + G.wave * 9) * G.stats.damage, '#c14dff', true, 0);
    for (let i = 0; i < 28; i++) {
      const a = rand(TAU);
      Particles.emit({
        x: h.x, y: h.y, vx: Math.cos(a) * rand(300, 1100), vy: Math.sin(a) * rand(300, 1100),
        life: rand(.5, 1.2), size: rand(4, 10),
        color: pick(['#c14dff', '#ffffff', '#ff2e88']), drag: .94
      });
    }
    for (const q of G.pickups.active) if (q.type === 'xp') q.mag = true;
  },

  flame(G, x, y, dps) {
    if (this.flames.length > 40) this.flames.shift();
    this.flames.push({ x, y, r: 34 * G.stats.area, life: 3, dps, dmgT: 0 });
  },

  /* ---------------- vẽ ---------------- */
  draw(g, G) {
    /* vũng lửa */
    for (const f of this.flames) {
      const t = clamp(f.life / 3, 0, 1);
      g.save();
      g.globalCompositeOperation = 'source-over';
      const grd = g.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
      grd.addColorStop(0, `rgba(255,180,60,${.34 * t})`);
      grd.addColorStop(1, 'rgba(255,60,20,0)');
      g.fillStyle = grd;
      g.beginPath(); g.arc(f.x, f.y, f.r, 0, TAU); g.fill();
      g.restore();
    }

    /* lỗ đen */
    for (const h of this.holes) {
      const t = clamp(h.life / h.maxLife, 0, 1);
      const grow = h.life > h.maxLife - .3 ? (h.maxLife - h.life) / .3 : 1;
      const R = h.r * grow;
      g.save();
      const grd = g.createRadialGradient(h.x, h.y, R * .05, h.x, h.y, R);
      grd.addColorStop(0, 'rgba(0,0,0,1)');
      grd.addColorStop(.42, 'rgba(24,4,44,.92)');
      grd.addColorStop(.78, `rgba(120,40,190,${.4 * t})`);
      grd.addColorStop(1, 'rgba(193,77,255,0)');
      g.fillStyle = grd;
      g.beginPath(); g.arc(h.x, h.y, R, 0, TAU); g.fill();

      g.globalCompositeOperation = 'source-over';
      g.strokeStyle = `rgba(193,77,255,${.75 * t})`;
      g.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.ellipse(h.x, h.y, R * (.55 + i * .16), R * (.2 + i * .07), h.spin + i * 1.1, 0, TAU);
        g.stroke();
      }
      g.restore();
    }
  },

  /** lớp phủ toàn màn hình (đóng băng / hành quyết) — vẽ sau khi bỏ camera */
  drawOverlay(g, G) {
    if (this.freezeT > 0) {
      const a = Math.min(1, this.freezeT / 2) * .2;
      g.fillStyle = `rgba(140,230,255,${a})`;
      g.fillRect(0, 0, G.W, G.H);
    }
    if (this.flashT > 0) {
      g.save();
      g.globalCompositeOperation = 'source-over';
      g.fillStyle = `rgba(255,20,80,${this.flashT * .9})`;
      g.fillRect(0, 0, G.W, G.H);
      g.restore();
    }
  }
};
