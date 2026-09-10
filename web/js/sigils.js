/* ============ NEON HORDE — ẤN KÝ (buff 4 tầng) ============
 *
 *  Khác trang bị bị động: mỗi Ấn Ký có 4 tầng, và TẦNG 4 BỊ KHOÁ sau một
 *  ngưỡng chỉ số. Mỗi Ấn tự cộng một ít đúng loại chỉ số nó cần, nhưng
 *  KHÔNG BAO GIỜ đủ một mình — bạn phải chủ động chọn trang bị tương ứng.
 *  => Chọn chỉ số gì sẽ quyết định mở được tầng cuối của Ấn nào.
 *
 *  Tầng 4 của mỗi Ấn là một pha "wow" hẳn, không phải cộng thêm vài %.
 * ========================================================== */
'use strict';

const SIGILS = {

  /* ================= 1. ẤN LÔI ĐÌNH ================= */
  thunder: {
    name: 'ẤN LÔI ĐÌNH', color: '#9d6bff', max: 4,
    tip: 'Cứ vài đòn đánh lại phóng ra một tia sét.',
    req: { key: 'haste', min: 1.5, label: 'Tốc đánh ≥ 150%' },
    awName: 'BÃO LÔI VÔ TẬN',
    apply: (s, lv) => { s.haste += .05 * lv; },
    desc: lv => [
      'Cứ <em>8</em> đòn đánh phóng 1 tia sét',
      'Cứ <em>6</em> đòn · sét lan <em>3</em> mục tiêu',
      'Cứ <em>5</em> đòn · lan <em>4</em> · làm <em>choáng</em>',
      'Cứ <em>4</em> đòn · lan <em>12</em> mục tiêu · sét chuyển <em>trắng–vàng</em> và <em>MẠNH DẦN +18%</em> sau mỗi lần nảy'
    ][lv - 1],
    icon(g, r) {
      g.strokeStyle = '#9d6bff'; g.lineWidth = 2.2;
      poly(g, 4, r * .82); g.stroke();
      g.fillStyle = '#e6d4ff'; g.strokeStyle = '#c9a8ff'; g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(r * .12, -r * .58); g.lineTo(-r * .32, r * .04); g.lineTo(-r * .02, r * .04);
      g.lineTo(-r * .16, r * .58); g.lineTo(r * .34, -r * .1); g.lineTo(r * .03, -r * .1);
      g.closePath(); g.fill(); g.stroke();
    },
    onHit(G, st, e) {
      const every = [8, 6, 5, 6][st.lv - 1];
      if (++st.n < every) return;
      st.n = 0;
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
    name: 'ẤN HUYẾT NGUYỆT', color: '#ff2e88', max: 4,
    tip: 'Càng đánh kẻ địch thoi thóp càng đau.',
    req: { key: 'lifesteal', min: .05, label: 'Hút máu ≥ 5%' },
    awName: 'NGUYỆT THỰC',
    apply: (s, lv) => { s.lifesteal += .008 * lv; },
    desc: lv => [
      'Hút máu <em>+0.8%</em> mỗi tầng',
      'Sát thương <em>+35%</em> lên kẻ địch dưới <em>25%</em> máu',
      'Mỗi lần hạ gục hồi <em>2</em> máu',
      '<em>HÀNH QUYẾT</em> tức thì mọi kẻ địch dưới <em>25%</em> máu — mỗi xác nổ thành <em>sóng máu</em> lan sang xung quanh'
    ][lv - 1],
    icon(g, r) {
      g.fillStyle = '#ff2e88';
      g.beginPath(); g.arc(0, 0, r * .72, 0, TAU); g.fill();
      g.globalCompositeOperation = 'destination-out';
      g.beginPath(); g.arc(r * .38, -r * .18, r * .62, 0, TAU); g.fill();
      g.globalCompositeOperation = 'source-over';
      g.fillStyle = '#ffd0e6';
      g.beginPath();
      g.moveTo(-r * .1, -r * .1);
      g.bezierCurveTo(r * .3, r * .18, r * .16, r * .6, -r * .1, r * .6);
      g.bezierCurveTo(-r * .36, r * .6, -r * .5, r * .18, -r * .1, -r * .1);
      g.fill();
    },
    dmgMul(G, st, e) {
      return (st.lv >= 2 && e.hp / e.maxHp < .25) ? 1.35 : 1;
    },
    onKill(G, st, e) {
      if (st.lv < 3) return;
      const p = G.player;
      if (p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + 2);
    },
    afterHit(G, st, e) {
      if (st.lv < 4 || e.dead || e.boss) return;
      if (e.hp / e.maxHp >= .12) return;
      Sigils.execute(G, e);
    }
  },

  /* ================= 3. ẤN BĂNG TINH ================= */
  frost: {
    name: 'ẤN BĂNG TINH', color: '#6fe6ff', max: 4,
    tip: 'Làm chậm, rồi nghiền nát cái gì đã chậm.',
    req: { key: 'area', min: 1.5, label: 'Phạm vi ≥ 150%' },
    awName: 'THỜI GIAN NGỪNG TRÔI',
    apply: (s, lv) => { s.area += .06 * lv; },
    desc: lv => [
      '<em>18%</em> đòn đánh làm chậm <em>25%</em>',
      'Kẻ địch đang bị chậm nhận thêm <em>25%</em> sát thương',
      'Kẻ địch chết khi đang chậm sẽ <em>nổ băng</em>',
      'Cứ <em>11 giây</em> <em>ĐÓNG BĂNG TOÀN MÀN HÌNH</em> 2 giây — xác đóng băng <em>vỡ tan</em> thành mảnh băng xuyên thấu'
    ][lv - 1],
    icon(g, r) {
      g.strokeStyle = '#6fe6ff'; g.lineWidth = 2.4; g.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const a = i / 3 * Math.PI;
        g.beginPath();
        g.moveTo(-Math.cos(a) * r * .78, -Math.sin(a) * r * .78);
        g.lineTo(Math.cos(a) * r * .78, Math.sin(a) * r * .78);
        g.stroke();
      }
      g.fillStyle = '#d6f6ff';
      star(g, 6, r * .34, r * .14); g.fill();
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
    name: 'ẤN HƯ KHÔNG', color: '#c14dff', max: 4,
    tip: 'Bẻ cong không gian: hút vật phẩm, rồi hút cả kẻ địch.',
    req: { key: 'pickup', min: 250, label: 'Tầm hút ≥ 250' },
    awName: 'HỐ ĐEN NGUYÊN THUỶ',
    apply: (s, lv) => { s.pickup += 30 * lv; },
    desc: lv => [
      'Tầm hút vật phẩm <em>+30</em> mỗi tầng',
      'Cứ <em>12 giây</em> mở một <em>lỗ đen</em> hút kẻ địch',
      'Lỗ đen <em>nghiền</em> kẻ địch bên trong',
      '<em>HỐ ĐEN KHỔNG LỒ</em> nuốt cả màn hình, khi tan thì <em>NỔ SIÊU TÂN TINH</em> và hút sạch ngọc toàn bản đồ'
    ][lv - 1],
    icon(g, r) {
      const grd = g.createRadialGradient(0, 0, r * .1, 0, 0, r * .8);
      grd.addColorStop(0, '#000'); grd.addColorStop(.55, '#2a0a44'); grd.addColorStop(1, 'rgba(193,77,255,0)');
      g.fillStyle = grd; g.beginPath(); g.arc(0, 0, r * .8, 0, TAU); g.fill();
      g.strokeStyle = '#c14dff'; g.lineWidth = 2.6;
      g.beginPath(); g.ellipse(0, 0, r * .78, r * .3, -.4, 0, TAU); g.stroke();
      g.fillStyle = '#000'; g.beginPath(); g.arc(0, 0, r * .3, 0, TAU); g.fill();
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
    name: 'ẤN PHƯỢNG HOÀNG', color: '#ff8a3c', max: 4,
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
    icon(g, r) {
      g.fillStyle = '#ff8a3c'; g.strokeStyle = '#ffd9a8'; g.lineWidth = 1.6;
      g.beginPath();
      g.moveTo(0, -r * .72);
      g.bezierCurveTo(r * .52, -r * .3, r * .82, r * .22, r * .34, r * .66);
      g.bezierCurveTo(r * .16, r * .3, -r * .16, r * .3, -r * .34, r * .66);
      g.bezierCurveTo(-r * .82, r * .22, -r * .52, -r * .3, 0, -r * .72);
      g.fill(); g.stroke();
      g.fillStyle = '#fff2c4';
      g.beginPath(); g.arc(0, r * .06, r * .17, 0, TAU); g.fill();
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

  reset() {
    this.holes.length = 0;
    this.flames.length = 0;
    this.freezeT = 0;
    this.flashT = 0;
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
    const wave = (10 + G.wave * 1.8) * G.stats.damage;
    FloatText.add(e.x, e.y - 20, 'HÀNH QUYẾT', '#ff2e88', 17);
    Particles.shockwave(e.x, e.y, 90, '#ff2e88');
    Particles.burst(e.x, e.y, 10, '#ff2e88', { speed: 280, life: .45, size: 5 });
    Sfx.explode(false);
    this.flashT = .09;
    for (const o of G.enemiesInRadius(e.x, e.y, 130)) {
      if (o === e) continue;
      G.damageEnemy(o, wave, { knock: 160, ang: angleTo(e.x, e.y, o.x, o.y), sigil: true });
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
      g.globalCompositeOperation = 'lighter';
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

      g.globalCompositeOperation = 'lighter';
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
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = `rgba(255,20,80,${this.flashT * .9})`;
      g.fillRect(0, 0, G.W, G.H);
      g.restore();
    }
  }
};
