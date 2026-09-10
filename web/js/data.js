/* ============ NEON HORDE — game data: characters, weapons, passives, enemies ============ */
'use strict';

/* ===================== NHÂN VẬT — 5 CHÚ CHUỘT ĐẦU BẾP =====================
   Chỉ số y hệt bản gốc, chỉ đổi tên và lời thoại cho khớp chủ đề bếp. */
const CHARACTERS = [
  {
    id: 'guard', name: 'BẾP TRƯỞNG', role: 'CHỊU ĐÒN', sprite: 'ch_guard', color: '#ff8a3c',
    weapon: 'blade',
    desc: 'Ba mươi năm đứng bếp. Dầu bắn vào mặt cũng không nhíu mắt.',
    mods: { maxHp: +45, armor: +3, moveSpeed: -.08, area: +.1 }
  },
  {
    id: 'ranger', name: 'THỢ KEM', role: 'SÁT THƯƠNG', sprite: 'ch_ranger', color: '#25f4ee',
    weapon: 'pistol',
    desc: 'Bắt bông nhanh tới mức không ai thấy tay nó động.',
    mods: { haste: +.20, pickup: +30, moveSpeed: +.04 }
  },
  {
    id: 'mage', name: 'THỢ LÀM BÁNH', role: 'DIỆN RỘNG', sprite: 'ch_mage', color: '#9d6bff',
    weapon: 'lightning',
    desc: 'Cái đánh trứng trong tay nó phát ra tia lửa. Mong manh mà đáng sợ.',
    mods: { damage: +.20, area: +.18, maxHp: -18 }
  },
  {
    id: 'assassin', name: 'THỢ SASHIMI', role: 'CHÍ MẠNG', sprite: 'ch_assassin', color: '#ff2e88',
    weapon: 'boomerang',
    desc: 'Một nhát đúng thớ thịt đáng giá mười nhát bừa.',
    mods: { crit: +.18, critDmg: +.3, moveSpeed: +.13, maxHp: -22 }
  },
  {
    id: 'engineer', name: 'THỢ NƯỚNG', role: 'HỖ TRỢ', sprite: 'ch_engineer', color: '#b6ff3a',
    weapon: 'bomb',
    desc: 'Cái gì cũng cho thêm một suất. Càng đông càng vui.',
    mods: { proj: +1, xpGain: +.15, regen: +.5 }
  }
];

function baseStats() {
  return {
    maxHp: 100, regen: 0, armor: 0, dodge: 0,
    moveSpeed: 1, damage: 1, haste: 1, area: 1,
    proj: 0, crit: .05, critDmg: 1.6, pickup: 96,
    lifesteal: 0, xpGain: 1, luck: 0
  };
}

/* ===================== WEAPONS ===================== */
/* fire(G, p, w) — G = game, p = player, w = weapon instance {id,lv,t,evolved,...} */

const WEAPONS = {

  /* ---------- 1. PISTOL ---------- */
  pistol: {
    name: 'SÚNG KEM', color: '#25f4ee', max: 8, pairId: 'proj', evoCd: 1.0,
    evoName: 'KEM NỔ TUNG',
    evoDesc: 'Viên kem nào <em>hạ gục</em> kẻ địch sẽ <em>tách thành 2 viên con tự truy đuổi</em> — con lại tách tiếp một lần nữa, tạo phản ứng dây chuyền quét sạch cả bếp.',
    tip: 'Bắt bông kem liên tục vào món ăn gần nhất.',
    stat: lv => ({ dmg: 13.87 + lv * 1.33, cd: 0.62 - lv * 0.035, n: 1 + (lv >= 4 ? 1 : 0) + (lv >= 7 ? 1 : 0), spd: 640 }),
    desc(lv) { const s = this.stat(lv); return `Sát thương <em>${Math.round(s.dmg)}</em> · ${s.n} viên kem · ${(1 / s.cd).toFixed(1)}/giây`; },
    icon(g, r) {                                  // túi bắt bông đang nhả kem
      g.beginPath();
      g.moveTo(-r * .66, -r * .52); g.lineTo(-r * .16, -r * .66);
      g.lineTo(r * .26, r * .02); g.lineTo(-r * .2, r * .3);
      g.closePath(); toon(g, '#7fe3f0', r * .11);
      g.beginPath(); g.ellipse(r * .34, r * .16, r * .16, r * .1, .6, 0, TAU);
      toon(g, '#c9ccd4', r * .09);                  // đầu bắt bông
      for (let i = 0; i < 3; i++) {                 // giọt kem bay ra
        g.beginPath(); g.arc(r * (.58 + i * .14), r * (.34 + i * .16), r * (.15 - i * .03), 0, TAU);
        toon(g, '#fff6e2', r * .07);
      }
    },
    fire(G, p, w) {
      const s = this.stat(w.lv);
      const tgt = G.nearestEnemy(p.x, p.y, 900);
      if (!tgt) return false;
      const base = angleTo(p.x, p.y, tgt.x, tgt.y);
      let n = s.n + G.stats.proj;
      const spread = 0.1;
      for (let i = 0; i < n; i++) {
        const a = base + (n > 1 ? (i - (n - 1) / 2) * spread : 0);
        G.spawnBullet({
          x: p.x, y: p.y, a, spd: s.spd, dmg: s.dmg * (w.evolved ? .52 : 1) * G.stats.damage,
          sprite: 'b_basic', color: w.evolved ? '#8ff6ff' : '#25f4ee',
          r: (w.evolved ? 10 : 7) * G.stats.area,
          life: 1.3, pierce: w.evolved ? 2 : 0, scale: G.stats.area, knock: 90,
          split: w.evolved ? 2 : 0          // ĐẠN PHÂN LIỆT: 2 đời (3+ đời là nổ dây chuyền hàm mũ)
        });
      }
      Sfx.shoot('pistol');
      G.muzzle(p.x, p.y, base, '#25f4ee');
      return true;
    }
  },

  /* ---------- 2. SHOTGUN ---------- */
  shotgun: {
    name: 'LỌ TIÊU', color: '#ffc93c', max: 8, pairId: 'pow', evoCd: 1.0,
    evoName: 'NỒI ÁP SUẤT',
    evoDesc: 'Không phun tiêu nữa: nã <em>một chiếc nồi áp suất khổng lồ</em> bay chậm, <em>xuyên qua tất cả</em> và <em>rải một chuỗi vụ nổ</em> dọc đường đi.',
    tip: 'Phun một nắm tiêu hình nón, cực rát ở cự ly gần.',
    stat: lv => ({ dmg: 10.0 + lv * 0.89, cd: 1.15 - lv * 0.055, n: 4 + Math.floor(lv * .7), spd: 560, spread: .62 }),
    desc(lv) { const s = this.stat(lv); return `<em>${s.n}</em> hạt tiêu × <em>${Math.round(s.dmg)}</em> sát thương`; },
    icon(g, r) {                                  // lọ tiêu đang rắc
      g.save(); g.rotate(-.5);
      g.beginPath();
      g.moveTo(-r * .28, r * .56); g.lineTo(-r * .28, -r * .2);
      g.quadraticCurveTo(-r * .28, -r * .46, 0, -r * .46);
      g.quadraticCurveTo(r * .28, -r * .46, r * .28, -r * .2);
      g.lineTo(r * .28, r * .56);
      g.closePath(); toon(g, '#ffd23f', r * .11);
      g.beginPath(); g.rect(-r * .32, -r * .64, r * .64, r * .22);
      toon(g, '#c9ccd4', r * .1);                   // nắp
      g.restore();
      for (let i = 0; i < 5; i++) {                 // hạt tiêu bắn ra
        const a = -.9 + i * .32;
        g.beginPath(); g.arc(Math.cos(a) * r * .76, Math.sin(a) * r * .76, r * .085, 0, TAU);
        toon(g, '#5a3a1a', r * .05);
      }
    },
    fire(G, p, w) {
      const s = this.stat(w.lv);
      const tgt = G.nearestEnemy(p.x, p.y, 620);
      if (!tgt) return false;
      const base = angleTo(p.x, p.y, tgt.x, tgt.y);

      if (w.evolved) {
        // PHÁO HẠM — một quả đạn khổng lồ, xuyên tất cả, rải nổ dọc đường
        const A = G.stats.area;
        G.spawnBullet({
          x: p.x, y: p.y, a: base, spd: 290, dmg: s.dmg * .42 * G.stats.damage,
          sprite: 'b_bomb', color: '#ffb02e', r: 26 * A,
          life: 2.6, pierce: 999, scale: A, knock: 300, spin: 5,
          trailBoom: { t: .18, r: 82 * A, dmg: s.dmg * .24 * G.stats.damage, color: '#ffb02e' },
          aoe: { r: 160 * A, dmg: s.dmg * .45 * G.stats.damage, color: '#ffb02e', big: true }
        });
        Sfx.shoot('shotgun'); Sfx.explode(false);
        G.muzzle(p.x, p.y, base, '#ffb02e', 1.8);
        Cam.addShake(2.5);
        return true;
      }

      const n = s.n + G.stats.proj;
      for (let i = 0; i < n; i++) {
        const a = base + rand(-s.spread, s.spread);
        G.spawnBullet({
          x: p.x, y: p.y, a, spd: s.spd * rand(.8, 1.2), dmg: s.dmg * G.stats.damage,
          sprite: 'b_pellet', color: '#ffc93c', r: 6 * G.stats.area,
          life: .55, scale: G.stats.area, knock: 130
        });
      }
      Sfx.shoot('shotgun');
      G.muzzle(p.x, p.y, base, '#ffc93c', 1.6);
      Cam.addShake(2.5);
      return true;
    }
  },

  /* ---------- 3. ORBITING BLADES ---------- */
  blade: {
    name: 'DAO PHAY XOAY', color: '#25f4ee', max: 8, pairId: 'area',
    evoName: 'CỐI XAY THỊT',
    evoDesc: '<em>Hai vòng dao quay ngược chiều nhau</em>, và <em>mỗi nhát băm bắn ra một sóng xung kích</em> băm lan sang món bên cạnh.',
    tip: 'Dao phay bay quanh bạn, băm mọi thứ chạm vào.',
    stat: lv => ({ dmg: 17.73 + lv * 1.77, n: 2 + Math.floor(lv / 2), rot: 2.5 + lv * .12, rad: 78 + lv * 5 }),
    desc(lv) { const s = this.stat(lv); return `<em>${s.n}</em> lưỡi dao · <em>${Math.round(s.dmg)}</em> sát thương/chạm`; },
    icon(g, r) {                                  // ba con dao phay bay vòng
      g.strokeStyle = INK; g.lineWidth = 3.4;
      g.setLineDash([6, 7]);
      g.beginPath(); g.arc(0, 0, r * .5, 0, TAU); g.stroke();
      g.setLineDash([]);
      for (let i = 0; i < 3; i++) {
        const a = i / 3 * TAU;
        g.save(); g.translate(Math.cos(a) * r * .5, Math.sin(a) * r * .5); g.rotate(a + Math.PI / 2);
        g.beginPath();
        g.moveTo(-r * .22, -r * .12); g.lineTo(r * .22, -r * .12);
        g.lineTo(r * .22, r * .04); g.lineTo(-r * .22, r * .12);
        g.closePath(); toon(g, '#e7edf5', r * .07);
        g.beginPath(); g.rect(-r * .36, -r * .06, r * .14, r * .12);
        toon(g, '#8d5a3c', r * .06);
        g.restore();
      }
    },
    passive: true,          // handled continuously, not on cooldown
    fire() { return false; }
  },

  /* ---------- 4. CHAIN LIGHTNING ---------- */
  lightning: {
    name: 'MÁY ĐÁNH TRỨNG', color: '#9d6bff', max: 8, pairId: 'pow', evoCd: 3.6,
    evoName: 'BÃO LÒ VI SÓNG',
    evoDesc: 'Không lan nữa — <em>gọi 3 tia điện giáng thẳng từ trần bếp</em>, thưa hơn hẳn nhưng <em>mỗi tia nặng gấp bội</em>, mỗi chỗ rơi để lại một <em>vũng điện cháy khét</em>.',
    tip: 'Điện giật một món rồi lan sang món kế bên.',
    stat: lv => ({ dmg: 25.4 + lv * 2.6, cd: 1.5 - lv * .085, chain: 2 + Math.floor(lv * .8), range: 300 }),
    desc(lv) { const s = this.stat(lv); return `<em>${Math.round(s.dmg)}</em> sát thương · lan <em>${s.chain}</em> mục tiêu`; },
    icon(g, r) {                                  // cái đánh trứng toé điện
      g.strokeStyle = INK; g.lineWidth = r * .17; g.lineCap = 'round';
      g.beginPath(); g.moveTo(r * .14, r * .68); g.lineTo(r * .14, r * .08); g.stroke();
      for (let i = -2; i <= 2; i++) {
        g.beginPath();
        g.moveTo(r * .14, r * .08);
        g.quadraticCurveTo(r * (.14 + i * .3), -r * .32, r * .14, -r * .66);
        g.stroke();
      }
      g.strokeStyle = '#c9ccd4'; g.lineWidth = r * .08;
      g.beginPath(); g.moveTo(r * .14, r * .68); g.lineTo(r * .14, r * .08); g.stroke();
      for (let i = -2; i <= 2; i++) {
        g.beginPath();
        g.moveTo(r * .14, r * .08);
        g.quadraticCurveTo(r * (.14 + i * .3), -r * .32, r * .14, -r * .66);
        g.stroke();
      }
      g.beginPath();                                // tia điện
      g.moveTo(-r * .3, -r * .68); g.lineTo(-r * .66, -r * .16); g.lineTo(-r * .42, -r * .16);
      g.lineTo(-r * .6, r * .34); g.lineTo(-r * .14, -r * .28); g.lineTo(-r * .38, -r * .28);
      g.closePath(); toon(g, '#ffd23f', r * .09);
    },
    fire(G, p, w) {
      const s = this.stat(w.lv);
      if (w.evolved) {
        // LÔI VŨ — sét giáng từ trời, để lại vũng điện
        if (!G.nearestEnemy(p.x, p.y, 900)) return false;
        G.thunderRain(3 + Math.floor(G.stats.proj / 3), s.dmg * .62 * G.stats.damage, s.dmg * .16 * G.stats.damage);
        Sfx.shoot('lightning');
        return true;
      }
      const first = G.nearestEnemy(p.x, p.y, s.range * G.stats.area * 1.6);
      if (!first) return false;
      G.chainLightning(p.x, p.y, first, s.chain + G.stats.proj, s.dmg * G.stats.damage, false);
      Sfx.shoot('lightning');
      Cam.addShake(3);
      return true;
    }
  },

  /* ---------- 5. BOMB ---------- */
  bomb: {
    name: 'BOM BỘT MÌ', color: '#ffb02e', max: 8, pairId: 'area', evoCd: 1.75,
    evoName: 'BOM MEN NỞ',
    evoDesc: 'Vụ nổ khổng lồ văng ra <em>2 bọc bột con</em>, và để lại <em>hố bột cháy khét 4 giây</em> ngay tại tâm.',
    tip: 'Ném bọc bột, nổ bung ra diện rộng.',
    stat: lv => ({ dmg: 37.59 + lv * 3.41, cd: 1.9 - lv * .1, r: 86 + lv * 7, n: 1 + Math.floor(lv / 4) }),
    desc(lv) { const s = this.stat(lv); return `Nổ <em>${Math.round(s.dmg)}</em> sát thương · bán kính <em>${Math.round(s.r)}</em>`; },
    icon(g, r) {                                  // bọc bột mì buộc miệng, bột bay ra
      for (const p of [[-.12, -.46, .17], [.2, -.62, .12], [-.38, -.64, .1]]) {
        g.beginPath(); g.arc(p[0] * r, p[1] * r, p[2] * r, 0, TAU);
        toon(g, '#ffffff', r * .07);
      }
      g.beginPath();
      g.moveTo(-r * .44, r * .58); g.lineTo(-r * .3, -r * .18);
      g.lineTo(r * .3, -r * .18); g.lineTo(r * .44, r * .58);
      g.closePath(); toon(g, '#f0e2c4', r * .11);
      g.beginPath(); g.rect(-r * .34, -r * .22, r * .68, r * .13);
      toon(g, '#c98b3a', r * .08);                   // dây buộc
    },
    fire(G, p, w) {
      const s = this.stat(w.lv);
      const n = s.n + G.stats.proj;
      let any = false;
      for (let i = 0; i < n; i++) {
        const tgt = G.randomEnemyNear(p.x, p.y, 520);
        const a = tgt ? angleTo(p.x, p.y, tgt.x, tgt.y) : rand(TAU);
        const d = tgt ? Math.min(dist(p.x, p.y, tgt.x, tgt.y), 480) : rand(140, 300);
        G.spawnBullet({
          x: p.x, y: p.y, a, spd: 340, dmg: 0, sprite: 'b_bomb', color: '#ffb02e',
          r: 11, life: d / 340, scale: G.stats.area, spin: 9, lob: true,
          aoe: {
            r: s.r * G.stats.area * (w.evolved ? 1.10 : 1),
            dmg: s.dmg * G.stats.damage * (w.evolved ? 1.55 : 1),
            color: '#ffb02e', big: true,
            cluster: w.evolved ? 2 : 0,
            // BOM HẠT NHÂN: để lại hố phóng xạ cháy 4 giây
            crater: w.evolved ? { life: 4, dps: s.dmg * .33 * G.stats.damage } : null
          }
        });
        any = true;
      }
      if (any) Sfx.shoot('bomb');
      return any;
    }
  },

  /* ---------- 6. LASER ---------- */
  laser: {
    name: 'ĐÈN KHÒ', color: '#ff2e88', max: 8, pairId: 'haste', evoCd: 1.35,
    evoName: 'KHÒ CẦU VỒNG',
    evoDesc: 'Lửa khò <em>nảy 4 lần</em> giữa các món ăn, <em>mỗi lần nảy đổi một màu cầu vồng</em> và vẫn xuyên thấu toàn bộ.',
    tip: 'Lửa khò xuyên qua toàn bộ món ăn trên đường đi.',
    stat: lv => ({ dmg: 33.84 + lv * 4.16, cd: 1.75 - lv * .1, w: 12 + lv * 2.4, len: 900 }),
    desc(lv) { const s = this.stat(lv); return `<em>${Math.round(s.dmg)}</em> sát thương xuyên thấu · lửa dày <em>${Math.round(s.w)}</em>`; },
    icon(g, r) {                                  // đèn khò phun lửa
      g.beginPath();                                // ngọn lửa
      g.moveTo(-r * .12, -r * .58); g.lineTo(r * .86, -r * .3);
      g.lineTo(r * .5, -r * .22); g.lineTo(r * .8, -r * .1);
      g.lineTo(-r * .12, -r * .12);
      g.closePath(); toon(g, '#ff8a3c', r * .1);
      g.beginPath();
      g.moveTo(-r * .1, -r * .44); g.lineTo(r * .46, -r * .28);
      g.lineTo(r * .1, -r * .2); g.lineTo(-r * .1, -r * .2);
      g.closePath(); toon(g, '#ffd23f', r * .07);
      g.beginPath();                                // bình gas
      g.rect(-r * .68, -r * .1, r * .38, r * .64);
      toon(g, '#d4246c', r * .11);
      g.beginPath(); g.rect(-r * .52, -r * .42, r * .42, r * .34);
      toon(g, '#c9ccd4', r * .09);                  // đầu khò
    },
    fire(G, p, w) {
      const s = this.stat(w.lv);
      const tgt = G.nearestEnemy(p.x, p.y, 1000);
      if (!tgt) return false;
      if (w.evolved) {
        // LĂNG KÍNH — tia nảy 6 lần, mỗi lần một màu cầu vồng
        G.prismBeam(tgt, 4 + Math.floor(G.stats.proj / 3), s.dmg * .59 * G.stats.damage, s.w * 1.15 * G.stats.area);
        Sfx.shoot('laser');
        return true;
      }
      const base = angleTo(p.x, p.y, tgt.x, tgt.y);
      G.fireLaser(p.x, p.y, base, s.len, s.w * G.stats.area, s.dmg * G.stats.damage);
      Sfx.shoot('laser');
      Cam.addShake(4);
      return true;
    }
  },

  /* ---------- 7. FROST NOVA ---------- */
  frost: {
    name: 'NITƠ LẠNH', color: '#6fe6ff', max: 8, pairId: 'area',
    evoName: 'BÃO TUYẾT NITƠ',
    evoDesc: 'Không còn từng đợt — một <em>cơn bão nitơ bám theo bạn</em> suốt màn chơi, liên tục làm chậm và gặm sát thương.',
    tip: 'Hơi nitơ lan ra, gây sát thương và làm chậm.',
    stat: lv => ({ dmg: 15.6 + lv * 1.9, cd: 2.4 - lv * .13, r: 130 + lv * 16, slow: .35 + lv * .04, dur: 1.6 + lv * .1 }),
    desc(lv) { const s = this.stat(lv); return `<em>${Math.round(s.dmg)}</em> sát thương · làm chậm <em>${Math.round(s.slow * 100)}%</em>`; },
    icon(g, r) {                                  // bình nitơ toả hơi lạnh
      g.beginPath();
      g.moveTo(-r * .32, r * .6); g.lineTo(-r * .32, -r * .28);
      g.quadraticCurveTo(-r * .32, -r * .52, 0, -r * .52);
      g.quadraticCurveTo(r * .32, -r * .52, r * .32, -r * .28);
      g.lineTo(r * .32, r * .6);
      g.closePath(); toon(g, '#8fe3f5', r * .11);
      g.beginPath(); g.rect(-r * .14, -r * .72, r * .28, r * .22);
      toon(g, '#c9ccd4', r * .09);
      for (let i = 0; i < 2; i++) {                 // hai bông tuyết toả ra
        const x = r * (i ? .66 : .5), y = r * (i ? -.5 : -.72);
        g.strokeStyle = INK; g.lineWidth = r * .11;
        for (let k = 0; k < 3; k++) {
          const b = k / 3 * Math.PI;
          g.beginPath();
          g.moveTo(x - Math.cos(b) * r * .15, y - Math.sin(b) * r * .15);
          g.lineTo(x + Math.cos(b) * r * .15, y + Math.sin(b) * r * .15);
          g.stroke();
        }
        g.strokeStyle = '#8fe3f5'; g.lineWidth = r * .055;
        for (let k = 0; k < 3; k++) {
          const b = k / 3 * Math.PI;
          g.beginPath();
          g.moveTo(x - Math.cos(b) * r * .15, y - Math.sin(b) * r * .15);
          g.lineTo(x + Math.cos(b) * r * .15, y + Math.sin(b) * r * .15);
          g.stroke();
        }
      }
    },
    fire(G, p, w) {
      const s = this.stat(w.lv);
      if (w.evolved) {
        // BÃO TUYẾT VĨNH CỬU — vùng băng bám theo người chơi, không dứt
        if (!w.blizzard || w.blizzard.life <= 0) {
          w.blizzard = G.addZone({
            x: p.x, y: p.y, r: s.r * .78 * G.stats.area, life: 999,
            dps: s.dmg * 1.10 * G.stats.damage, color: '#aef3ff',
            slow: .5, follow: true, fx: 12
          });
          UI.announce('BÃO TUYẾT', '#aef3ff');
        }
        w.blizzard.r = s.r * .78 * G.stats.area;
        w.blizzard.dps = s.dmg * 1.10 * G.stats.damage;
        // thỉnh thoảng phóng băng đâm ra ngoài
        for (let i = 0; i < 1; i++) {
          const a = rand(TAU);
          G.spawnBullet({
            x: p.x, y: p.y, a, spd: 460, dmg: s.dmg * G.stats.damage,
            sprite: 'b_frost', color: '#aef3ff', r: 10 * G.stats.area,
            life: .9, pierce: 2, scale: G.stats.area, spin: 10, slow: .35
          });
        }
        Sfx.shoot('frost');
        return true;
      }
      G.frostNova(p.x, p.y, s.r * G.stats.area, s.dmg * G.stats.damage, s.slow, s.dur, false);
      Sfx.shoot('frost');
      return true;
    }
  },

  /* ---------- 8. HOMING MISSILES ---------- */
  missile: {
    name: 'XÚC XÍCH TẦM NHIỆT', color: '#ff2e88', max: 8, pairId: 'proj', evoCd: 2.1,
    evoName: 'MƯA XÚC XÍCH',
    evoDesc: 'Phóng <em>loạt 4 cái</em> bay vòng cung lên trần rồi <em>rơi rải khắp bếp</em>, mỗi cái nổ diện rộng.',
    tip: 'Xúc xích nóng tự truy đuổi món ăn.',
    stat: lv => ({ dmg: 27.79 + lv * 2.71, cd: 1.5 - lv * .08, n: 1 + Math.floor(lv / 2), turn: 4.5 }),
    desc(lv) { const s = this.stat(lv); return `<em>${s.n}</em> xúc xích × <em>${Math.round(s.dmg)}</em> sát thương`; },
    icon(g, r) {                                  // xúc xích có vệt lửa đẩy
      g.save(); g.rotate(-.6);
      g.beginPath();                                // vệt lửa
      g.moveTo(-r * .4, -r * .17); g.lineTo(-r * .92, 0); g.lineTo(-r * .4, r * .17);
      g.closePath(); toon(g, '#ff8a3c', r * .09);
      g.beginPath(); g.ellipse(r * .14, 0, r * .5, r * .26, 0, 0, TAU);
      toon(g, '#ff8f6b', r * .11);
      g.strokeStyle = INK; g.lineWidth = r * .07;    // vết nướng
      for (let i = -1; i <= 1; i++) {
        g.beginPath(); g.moveTo(r * (.14 + i * .22), -r * .18); g.lineTo(r * (.22 + i * .22), r * .18); g.stroke();
      }
      g.restore();
    },
    fire(G, p, w) {
      const s = this.stat(w.lv);
      const n = s.n + G.stats.proj;
      if (!G.nearestEnemy(p.x, p.y, 1200)) return false;

      if (w.evolved) {
        // HOẢ TIỄN OANH TẠC — loạt 14 quả bay vòng cung rồi rơi khắp màn hình
        const A = G.stats.area;
        const total = 4 + Math.floor(G.stats.proj / 2);
        for (let i = 0; i < total; i++) {
          const tgt = G.randomEnemyNear(p.x, p.y, 700);
          const a = tgt ? angleTo(p.x, p.y, tgt.x, tgt.y) + rand(-.25, .25) : rand(TAU);
          const d = tgt ? Math.min(dist(p.x, p.y, tgt.x, tgt.y), 640) : rand(200, 500);
          G.spawnBullet({
            x: p.x, y: p.y, a, spd: 400, dmg: 0,
            sprite: 'b_missile', color: '#ff2e88', r: 11 * A,
            life: d / 400, scale: A, spin: 4, lob: true, delay: i * .07,
            trail: '#ff88bb',
            aoe: { r: 84 * A, dmg: s.dmg * .33 * G.stats.damage, color: '#ff2e88' }
          });
        }
        Sfx.shoot('missile');
        Cam.addShake(3);
        return true;
      }

      for (let i = 0; i < n; i++) {
        const a = rand(TAU);
        G.spawnBullet({
          x: p.x, y: p.y, a, spd: 190, dmg: s.dmg * G.stats.damage,
          sprite: 'b_missile', color: '#ff2e88', r: 9 * G.stats.area, life: 3.4,
          homing: s.turn, accel: 800, maxSpd: 620, scale: G.stats.area, trail: '#ff88bb',
          delay: i * .07
        });
      }
      Sfx.shoot('missile');
      return true;
    }
  },

  /* ---------- 9. AURA ---------- */
  aura: {
    name: 'LÒ NƯỚNG ĐỎ LỬA', color: '#b6ff3a', max: 8, pairId: 'area',
    evoName: 'LÒ QUÁ TẢI',
    evoDesc: 'Lò <em>tự nở to theo số món đứng bên trong</em>, và cứ mỗi nhịp lại <em>phóng tia lửa tới tất cả</em> chúng.',
    tip: 'Vùng nhiệt quanh bạn liên tục thiêu món ăn.',
    stat: lv => ({ dmg: 11.53 + lv * 1.27, cd: .5, r: 92 + lv * 11 }),
    desc(lv) { const s = this.stat(lv); return `<em>${Math.round(s.dmg * 2)}</em> sát thương/giây · bán kính <em>${Math.round(s.r)}</em>`; },
    icon(g, r) {                                  // vòng nhiệt lò nướng
      g.beginPath(); g.arc(0, 0, r * .72, 0, TAU);
      toon(g, '#5a4436', r * .1);
      for (let i = 2; i >= 0; i--) {                // dây điện trở
        const rr = r * (.24 + i * .2);
        g.strokeStyle = INK; g.lineWidth = r * .19;
        g.beginPath(); g.arc(0, 0, rr, .35, TAU - .35); g.stroke();
        g.strokeStyle = i === 0 ? '#ffd23f' : '#ff8a3c'; g.lineWidth = r * .1;
        g.beginPath(); g.arc(0, 0, rr, .35, TAU - .35); g.stroke();
      }
    },
    fire(G, p, w) {
      const s = this.stat(w.lv);
      let R = s.r * G.stats.area;

      if (w.evolved) {
        // LÒ PHẢN ỨNG — bán kính nở theo số kẻ địch bên trong, rồi phóng điện tới tất cả
        const inside = G.enemiesInRadius(p.x, p.y, R * 1.1).length;
        // nở tối đa ~1.46 lần (trước là 2.28) — vùng sát thương tính theo BÌNH PHƯƠNG
        // bán kính, nên nới rộng thêm chút là mạnh lên rất nhiều
        w.reactor = lerp(w.reactor || 1, 1.05 + Math.min(inside, 18) * .006, .25);
        R *= w.reactor;
        const hits = G.enemiesInRadius(p.x, p.y, R);
        for (const e of hits) {
          G.damageEnemy(e, s.dmg * 1.5 * G.stats.damage, { silent: true, sigil: true });
          if (Math.random() < .2)
            G.arcs.push({
              x1: p.x, y1: p.y, x2: e.x, y2: e.y,
              life: .18, maxLife: .18, seed: rand(1000), color: '#e6ffb0'
            });
        }
        if (hits.length) Particles.ring(p.x, p.y, R, '#b6ff3a', .22, 3);
        G.auraPulse(p.x, p.y, R, true);
        return true;
      }

      for (const e of G.enemiesInRadius(p.x, p.y, R))
        G.damageEnemy(e, s.dmg * G.stats.damage, { silent: true, sigil: true });
      G.auraPulse(p.x, p.y, R, false);
      return true;
    }
  },

  /* ---------- 10. BOOMERANG ---------- */
  boomerang: {
    name: 'ĐĨA BAY', color: '#eafcff', max: 8, pairId: 'crit', evoCd: 1.25,
    evoName: 'ĐĨA BAY VÔ TẬN',
    evoDesc: 'Đĩa <em>bay mãi không quay về</em>, và <em>mỗi lần chém trúng lại to thêm và mạnh thêm</em> — càng đông càng khủng khiếp.',
    tip: 'Phóng đĩa bay đi rồi quay về, xuyên nhiều món ăn.',
    stat: lv => ({ dmg: 20.37 + lv * 2.13, cd: 1.25 - lv * .06, n: 1 + Math.floor(lv / 3), range: 300 + lv * 16 }),
    desc(lv) { const s = this.stat(lv); return `<em>${s.n}</em> đĩa × <em>${Math.round(s.dmg)}</em> · xuyên thấu`; },
    icon(g, r) {                                  // cái đĩa đang bay, có vệt gió
      g.strokeStyle = INK; g.lineWidth = r * .09; g.lineCap = 'round';
      for (let i = -1; i <= 1; i++) {
        g.beginPath(); g.moveTo(-r * .76, i * r * .28); g.lineTo(-r * .98, i * r * .28); g.stroke();
      }
      g.beginPath(); g.ellipse(0, 0, r * .66, r * .5, 0, 0, TAU);
      toon(g, '#fff6e2', r * .11);
      g.beginPath(); g.ellipse(0, 0, r * .38, r * .28, 0, 0, TAU);
      toon(g, '#dfe6f0', r * .08);
    },
    fire(G, p, w) {
      const s = this.stat(w.lv);
      const tgt = G.nearestEnemy(p.x, p.y, 800);
      const base = tgt ? angleTo(p.x, p.y, tgt.x, tgt.y) : rand(TAU);
      const n = s.n + G.stats.proj;
      for (let i = 0; i < n; i++) {
        const a = base + (n > 1 ? (i - (n - 1) / 2) * .5 : 0);
        G.spawnBullet({
          x: p.x, y: p.y, a, spd: 620, dmg: s.dmg * (w.evolved ? 1.05 : 1) * G.stats.damage,
          sprite: 'b_blade', color: '#eafcff', r: 17 * G.stats.area,
          life: w.evolved ? 8 : 3, pierce: 999, spin: 17, boomerang: true,
          // tiến hoá: bay vòng NGẮN hơn để luôn quẩn trong đám đông thay vì lượn ra xa
          range: s.range * G.stats.area * (w.evolved ? .5 : 1), scale: G.stats.area,
          hitCd: w.evolved ? .32 : .35, owner: p, noReturn: w.evolved,
          // LƯỠI HÁI: mỗi lần chém trúng lại to & mạnh thêm 4,5%, tối đa 6 lần
          grow: w.evolved ? .045 : 0, growCap: 6
        });
      }
      Sfx.shoot('blade');
      return true;
    }
  }
};

/* ===================== TRANG BỊ BỊ ĐỘNG — ĐỒ NGHỀ TRONG BẾP =====================
   Số liệu (`desc`, `apply`, `max`, `color`) y hệt bản gốc trên `main`.
   Biểu tượng vẽ kiểu TRUYỆN TRANH: khối màu bẹt + viền mực dày, xem hàm `toon()`. */
const PASSIVES = {
  pow: {
    name: 'ỚT HIỂM', color: '#d4242f', max: 5,
    desc: lv => `Sát thương <em>+${lv * 12}%</em>`,
    apply: (s, lv) => { s.damage += .12 * lv; },
    icon(g, r) {
      g.strokeStyle = INK; g.lineWidth = r * .17; g.lineCap = 'round';
      g.beginPath(); g.moveTo(r * .08, -r * .26); g.lineTo(-r * .2, -r * .66); g.stroke();
      g.strokeStyle = '#3ec46d'; g.lineWidth = r * .09;
      g.beginPath(); g.moveTo(r * .08, -r * .26); g.lineTo(-r * .2, -r * .66); g.stroke();
      g.beginPath();
      g.moveTo(r * .1, -r * .3);
      g.bezierCurveTo(r * .58, -r * .04, r * .36, r * .64, -r * .06, r * .64);
      g.bezierCurveTo(-r * .32, r * .64, -r * .32, r * .1, r * .1, -r * .3);
      toon(g, '#ff4a4a', r * .11);
    }
  },
  haste: {
    name: 'ĐỒNG HỒ BẾP', color: '#137f96', max: 5,
    desc: lv => `Tốc độ tấn công <em>+${lv * 11}%</em>`,
    apply: (s, lv) => { s.haste += .11 * lv; },
    icon(g, r) {
      g.beginPath(); g.rect(-r * .17, -r * .74, r * .34, r * .2);
      toon(g, '#c9ccd4', r * .1);                    // núm vặn
      g.beginPath(); g.arc(0, r * .08, r * .58, 0, TAU);
      toon(g, '#3ec9dd', r * .12);
      g.beginPath(); g.arc(0, r * .08, r * .4, 0, TAU);
      toon(g, '#fff6e2', r * .08);
      g.strokeStyle = INK; g.lineWidth = r * .1; g.lineCap = 'round';
      g.beginPath(); g.moveTo(0, r * .08); g.lineTo(0, -r * .26); g.stroke();
      g.beginPath(); g.moveTo(0, r * .08); g.lineTo(r * .26, r * .2); g.stroke();
    }
  },
  speed: {
    name: 'GIÀY CHỐNG TRƯỢT', color: '#4f8d13', max: 5,
    desc: lv => `Tốc độ di chuyển <em>+${lv * 8}%</em>`,
    apply: (s, lv) => { s.moveSpeed += .08 * lv; },
    icon(g, r) {
      g.strokeStyle = INK; g.lineWidth = r * .13; g.lineCap = 'round';
      for (let i = -1; i <= 1; i++) {                // vệt gió
        g.beginPath(); g.moveTo(-r * .78, i * r * .34); g.lineTo(-r * .42, i * r * .34); g.stroke();
      }
      g.beginPath();                                 // chiếc giày
      g.moveTo(-r * .38, r * .4); g.lineTo(-r * .38, -r * .1);
      g.quadraticCurveTo(-r * .1, -r * .16, r * .1, -r * .44);
      g.quadraticCurveTo(r * .34, -r * .22, r * .62, r * .06);
      g.lineTo(r * .62, r * .4);
      g.closePath(); toon(g, '#8ac926', r * .11);
      g.beginPath(); g.rect(-r * .42, r * .34, r * 1.08, r * .2);
      toon(g, '#fff6e2', r * .09);                   // đế
    }
  },
  hp: {
    name: 'Ổ BÁNH MÌ', color: '#c4232f', max: 5,
    desc: lv => `Máu tối đa <em>+${lv * 22}</em>`,
    apply: (s, lv) => { s.maxHp += 22 * lv; },
    icon(g, r) {
      g.beginPath();
      g.moveTo(-r * .62, r * .4);
      g.quadraticCurveTo(-r * .62, -r * .5, 0, -r * .5);
      g.quadraticCurveTo(r * .62, -r * .5, r * .62, r * .4);
      g.closePath(); toon(g, '#e0a352', r * .12);
      g.strokeStyle = INK; g.lineWidth = r * .09; g.lineCap = 'round';
      for (let i = -1; i <= 1; i++) {                // vết nứt vỏ
        g.beginPath(); g.moveTo(i * r * .32 - r * .1, -r * .3); g.lineTo(i * r * .32 + r * .12, r * .18); g.stroke();
      }
    }
  },
  armor: {
    name: 'BAO TAY LÒ', color: '#6b3fd4', max: 5,
    desc: lv => `Giáp <em>+${lv * 2}</em> (giảm sát thương nhận)`,
    apply: (s, lv) => { s.armor += 2 * lv; },
    icon(g, r) {
      g.beginPath();                                 // ngón cái
      g.moveTo(-r * .3, r * .1);
      g.quadraticCurveTo(-r * .74, r * .12, -r * .64, r * .54);
      g.lineTo(-r * .3, r * .5);
      g.closePath(); toon(g, '#8fa8ff', r * .11);
      g.beginPath();                                 // thân bao tay
      g.moveTo(-r * .34, r * .62); g.lineTo(-r * .34, -r * .12);
      g.quadraticCurveTo(-r * .34, -r * .66, r * .06, -r * .66);
      g.quadraticCurveTo(r * .42, -r * .66, r * .42, -r * .2);
      g.lineTo(r * .42, r * .62);
      g.closePath(); toon(g, '#8fa8ff', r * .12);
      g.beginPath(); g.rect(-r * .38, r * .38, r * .84, r * .22);
      toon(g, '#fff6e2', r * .09);                   // viền bo
    }
  },
  magnet: {
    name: 'CÁI VÁ LỚN', color: '#137f96', max: 5,
    desc: lv => `Tầm hút vật phẩm <em>+${lv * 40}</em>`,
    apply: (s, lv) => { s.pickup += 40 * lv; },
    icon(g, r) {
      g.strokeStyle = INK; g.lineWidth = r * .22;
      g.beginPath(); g.moveTo(0, r * .22); g.lineTo(0, -r * .6); g.stroke();
      g.strokeStyle = '#c9ccd4'; g.lineWidth = r * .11;
      g.beginPath(); g.moveTo(0, r * .22); g.lineTo(0, -r * .6); g.stroke();
      g.beginPath(); g.arc(0, r * .22, r * .4, 0, Math.PI);
      toon(g, '#3ec9dd', r * .12);
    }
  },
  crit: {
    name: 'DAO MÀI SẮC', color: '#c97f0a', max: 5,
    desc: lv => `Tỉ lệ chí mạng <em>+${lv * 8}%</em>`,
    apply: (s, lv) => { s.crit += .08 * lv; },
    icon(g, r) {
      g.save(); g.rotate(-Math.PI / 4);
      g.beginPath(); g.rect(-r * .12, -r * .74, r * .34, r * 1.1);
      toon(g, '#e7edf5', r * .11);                   // lưỡi
      g.beginPath(); g.rect(-r * .12, r * .36, r * .34, r * .4);
      toon(g, '#8d5a3c', r * .11);                   // cán
      g.restore();
      g.strokeStyle = INK; g.lineWidth = r * .1; g.lineCap = 'round';
      for (let i = 0; i < 3; i++) {                  // tia lấp lánh
        const a = -1.1 + i * .5;
        g.beginPath();
        g.moveTo(Math.cos(a) * r * .58, Math.sin(a) * r * .58);
        g.lineTo(Math.cos(a) * r * .84, Math.sin(a) * r * .84);
        g.stroke();
      }
    }
  },
  critd: {
    name: 'BÚA DẦN THỊT', color: '#c97f0a', max: 5,
    desc: lv => `Sát thương chí mạng <em>+${lv * 30}%</em>`,
    apply: (s, lv) => { s.critDmg += .3 * lv; },
    icon(g, r) {
      g.strokeStyle = INK; g.lineWidth = r * .24;
      g.beginPath(); g.moveTo(0, -r * .08); g.lineTo(0, r * .68); g.stroke();
      g.strokeStyle = '#8d5a3c'; g.lineWidth = r * .13;
      g.beginPath(); g.moveTo(0, -r * .08); g.lineTo(0, r * .68); g.stroke();
      g.beginPath(); g.rect(-r * .58, -r * .62, r * 1.16, r * .54);
      toon(g, '#ff8a3c', r * .12);
      g.fillStyle = INK;
      for (let x = -1; x <= 1; x++) {
        for (let y = 0; y <= 1; y++) {
          g.beginPath(); g.arc(x * r * .3, -r * .5 + y * r * .26, r * .07, 0, TAU); g.fill();
        }
      }
    }
  },
  regen: {
    name: 'NƯỚC DÙNG HẦM', color: '#4f8d13', max: 5,
    desc: lv => `Hồi <em>${(lv * .9).toFixed(1)}</em> máu mỗi giây`,
    apply: (s, lv) => { s.regen += .9 * lv; },
    icon(g, r) {
      g.strokeStyle = INK; g.lineWidth = r * .13; g.lineCap = 'round';
      for (let i = -1; i <= 1; i++) {                // hơi nóng
        g.beginPath();
        g.moveTo(i * r * .3, -r * .14);
        g.quadraticCurveTo(i * r * .3 + r * .18, -r * .4, i * r * .3, -r * .66);
        g.stroke();
      }
      g.beginPath(); g.arc(0, r * .06, r * .6, 0, Math.PI);
      toon(g, '#3ec46d', r * .12);
      g.beginPath(); g.rect(-r * .68, r * .0, r * 1.36, r * .16);
      toon(g, '#fff6e2', r * .1);
    }
  },
  area: {
    name: 'CHẢO ĐẠI', color: '#6b3fd4', max: 5,
    desc: lv => `Phạm vi kỹ năng <em>+${lv * 14}%</em>`,
    apply: (s, lv) => { s.area += .14 * lv; },
    icon(g, r) {
      g.strokeStyle = INK; g.lineWidth = r * .2;     // cán
      g.beginPath(); g.moveTo(r * .34, r * .16); g.lineTo(r * .88, r * .34); g.stroke();
      g.strokeStyle = '#8d5a3c'; g.lineWidth = r * .11;
      g.beginPath(); g.moveTo(r * .34, r * .16); g.lineTo(r * .88, r * .34); g.stroke();
      g.beginPath(); g.arc(-r * .08, -r * .04, r * .54, 0, TAU);
      toon(g, '#8b7fb0', r * .12);
      g.beginPath(); g.arc(-r * .08, -r * .04, r * .34, 0, TAU);
      toon(g, '#6b3fd4', r * .08);
    }
  },
  proj: {
    name: 'THÊM MỘT SUẤT', color: '#c97f0a', max: 3,
    desc: lv => `Tất cả vũ khí <em>+${lv}</em> đạn`,
    apply: (s, lv) => { s.proj += lv; },
    icon(g, r) {
      for (let i = 1; i >= -1; i--) {                // ba cái đĩa xếp chồng
        g.beginPath(); g.ellipse(0, i * r * .26 + r * .2, r * .58 - Math.abs(i) * r * .05, r * .18, 0, 0, TAU);
        toon(g, i === -1 ? '#fff6e2' : '#f3e4c6', r * .1);
      }
      g.strokeStyle = INK; g.lineWidth = r * .16; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-r * .2, -r * .5); g.lineTo(r * .2, -r * .5); g.stroke();
      g.beginPath(); g.moveTo(0, -r * .7); g.lineTo(0, -r * .3); g.stroke();
    }
  },
  lifesteal: {
    name: 'XỐT CÀ CHUA', color: '#d4246c', max: 5,
    desc: lv => `Hút <em>${(lv * 1.4).toFixed(1)}%</em> sát thương thành máu`,
    apply: (s, lv) => { s.lifesteal += .014 * lv; },
    icon(g, r) {
      g.beginPath();
      g.moveTo(0, -r * .68);
      g.bezierCurveTo(r * .58, r * .02, r * .4, r * .66, 0, r * .66);
      g.bezierCurveTo(-r * .4, r * .66, -r * .58, r * .02, 0, -r * .68);
      toon(g, '#ff4a4a', r * .12);
      g.save(); g.globalAlpha = .8; g.fillStyle = '#fff6e2';
      g.beginPath(); g.ellipse(-r * .16, r * .16, r * .1, r * .18, -.4, 0, TAU); g.fill();
      g.restore();
    }
  },
  dodge: {
    name: 'TẠP DỀ TRƠN', color: '#6b3fd4', max: 5,
    desc: lv => `Né tránh <em>+${lv * 6}%</em>`,
    apply: (s, lv) => { s.dodge += .06 * lv; },
    icon(g, r) {
      g.strokeStyle = INK; g.lineWidth = r * .1; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-r * .24, -r * .52); g.lineTo(-r * .54, -r * .72); g.stroke();
      g.beginPath(); g.moveTo(r * .24, -r * .52); g.lineTo(r * .54, -r * .72); g.stroke();
      g.beginPath();
      g.moveTo(-r * .24, -r * .52); g.lineTo(r * .24, -r * .52);
      g.lineTo(r * .32, -r * .16); g.lineTo(r * .5, r * .6);
      g.lineTo(-r * .5, r * .6); g.lineTo(-r * .32, -r * .16);
      g.closePath(); toon(g, '#8fa8ff', r * .12);
      g.beginPath(); g.rect(-r * .44, r * .16, r * .88, r * .14);
      toon(g, '#fff6e2', r * .08);
    }
  },
  xp: {
    name: 'SỔ CÔNG THỨC', color: '#137f96', max: 5,
    desc: lv => `Kinh nghiệm nhận được <em>+${lv * 16}%</em>`,
    apply: (s, lv) => { s.xpGain += .16 * lv; },
    icon(g, r) {
      g.beginPath();
      g.moveTo(-r * .58, -r * .48); g.lineTo(0, -r * .3); g.lineTo(r * .58, -r * .48);
      g.lineTo(r * .58, r * .52); g.lineTo(0, r * .36); g.lineTo(-r * .58, r * .52);
      g.closePath(); toon(g, '#fff6e2', r * .12);
      g.strokeStyle = INK; g.lineWidth = r * .09;
      g.beginPath(); g.moveTo(0, -r * .3); g.lineTo(0, r * .36); g.stroke();
      g.strokeStyle = '#137f96'; g.lineWidth = r * .06;
      for (let i = 0; i < 3; i++) {
        const y = -r * .1 + i * r * .17;
        g.beginPath(); g.moveTo(-r * .44, y); g.lineTo(-r * .12, y + r * .04); g.stroke();
        g.beginPath(); g.moveTo(r * .12, y + r * .04); g.lineTo(r * .44, y); g.stroke();
      }
    }
  }
};

/* register weapon + passive icons into Art */
for (const id in WEAPONS) {
  const w = WEAPONS[id];
  Art.build['w_' + id] = () => bake(72, (g, r) => w.icon(g, r * .82), 14, w.color);
}
for (const id in PASSIVES) {
  const p = PASSIVES[id];
  Art.build['i_' + id] = () => bake(72, (g, r) => p.icon(g, r * .82), 14, p.color);
}

/* ===================== QUÁI — ĐỒ ĂN =====================
   Tên id giữ nguyên (code khắp nơi tham chiếu tới), chỉ ghi kèm món tương ứng:
     grunt = CÀ CHUA · swarm = CÀ RỐT · tank = BẮP CẢI TÍM · shooter = CHAI XỐT
     splitter = BÔNG CẢI XANH · charger = BẮP NGÔ · bomber = THANH LONG · orbiter = ĐẬU HÀ LAN */
const ENEMIES = {
  grunt: { sprite: 'e_grunt', r: 15, hp: 22, spd: 80, dmg: 9, xp: 1, color: '#ff4d5e', ai: 'chase' },
  swarm: { sprite: 'e_swarm', r: 10, hp: 10, spd: 136, dmg: 6, xp: 1, color: '#ffa62e', ai: 'chase' },
  tank: { sprite: 'e_tank', r: 27, hp: 130, spd: 48, dmg: 18, xp: 5, color: '#8f5bff', ai: 'chase', knockRes: .75 },
  shooter: { sprite: 'e_shooter', r: 16, hp: 34, spd: 64, dmg: 8, xp: 3, color: '#3ce0ff', ai: 'shoot', range: 320 },
  splitter: { sprite: 'e_splitter', r: 19, hp: 46, spd: 74, dmg: 10, xp: 3, color: '#3affa0', ai: 'chase', split: 3 },
  charger: { sprite: 'e_charger', r: 17, hp: 42, spd: 72, dmg: 16, xp: 3, color: '#ffe23c', ai: 'charge' },
  bomber: { sprite: 'e_bomber', r: 18, hp: 30, spd: 92, dmg: 10, xp: 3, color: '#ff5ecf', ai: 'chase', deathBomb: 34 },
  orbiter: { sprite: 'e_orbiter', r: 14, hp: 40, spd: 110, dmg: 9, xp: 2, color: '#7cff2e', ai: 'orbit' }
};

/* spawn table: which enemies unlock at which wave, with weights */
const SPAWN_TABLE = [
  { id: 'grunt', from: 1, w: 10 },
  { id: 'swarm', from: 2, w: 8 },
  { id: 'charger', from: 3, w: 4 },
  { id: 'shooter', from: 4, w: 4 },
  { id: 'tank', from: 5, w: 3 },
  { id: 'bomber', from: 6, w: 3.5 },
  { id: 'splitter', from: 7, w: 3.5 },
  { id: 'orbiter', from: 8, w: 3.5 }
];

/* ---------- LUẬT ĐẤU TRƯỜNG ----------
 * Mỗi trùm mang theo một luật bẻ cong cách chơi, CHỈ có hiệu lực trong lúc
 * đánh trùm đó rồi tự gỡ khi trùm chết. Mục đích: mỗi trận trùm buộc người
 * chơi đổi cách xoay xở chứ không chỉ là một túi máu to hơn.
 *
 * ⚠ Luật chỉ được phép bóp CÁCH DI CHUYỂN / TẦM NHÌN / HỒI MÁU.
 *   Đừng thêm luật khoá vũ khí — bắn là tự động, khoá đi thì người chơi
 *   ngồi nhìn, không phải thử thách mà là bị phạt.
 */
const BOSS_RULES = {
  bloodthirst: { name: 'CAY XÉ LƯỠI', color: '#ff2e4d', desc: 'Không tự hồi máu · hút máu vô hiệu' },
  gravity:     { name: 'HÚT XOÁY',    color: '#c14dff', desc: 'Bị kéo về phía nồi' },
  chained:     { name: 'KHOÁ NẮP',    color: '#ffb02e', desc: 'Không lướt được' },
  frostbite:   { name: 'TÊ BUỐT',     color: '#6fe6ff', desc: 'Tốc chạy −35%' },
  inverted:    { name: 'SOI GƯƠNG',   color: '#3affa0', desc: 'Điều khiển bị đảo ngược' },
  eclipse:     { name: 'CHÁY KHÉT',   color: '#ff6a2e', desc: 'Khói đen, chỉ nhìn thấy quanh mình' },
  hive:        { name: 'CHIA SUẤT',   color: '#ff2e88', desc: 'Món thường chết đều tách đôi' },
  collapse:    { name: 'BẾP CO LẠI',  color: '#eafcff', desc: 'Đấu trường co lại dần' }
};

/* ---------- TRÙM ----------
 * Thứ tự trong mảng = thứ tự xuất hiện (màn 5, 10, 15, 20, ...) nên phải xếp
 * từ dễ tới khó. Hết mảng thì QUAY VÒNG lại từ đầu — độ khó về sau do
 * `tier` trong startBoss() lo, KHÔNG phải do cộng thêm máu gốc ở đây.
 *
 * ⚠ Máu gốc cố ý chỉ nhích nhẹ từ con thứ 4 trở đi. startBoss() đã nhân
 *   `(1 + tier*2.4) * (1 + (màn-5)*0.12)` — ở màn 40 hệ số đã là ~30 lần.
 *   Nếu để máu gốc cũng tăng gấp đôi mỗi con thì trùm màn 40 thành bất tử.
 */
const BOSSES = [
  {
    name: 'NỒI LẨU CAY', sprite: 'e_boss', color: '#ff2e4d', r: 56,
    hp: 1500, spd: 46, dmg: 26, xp: 60, rule: 'bloodthirst',
    patterns: ['radial', 'charge', 'summon']
  },
  {
    name: 'CỐI XAY SINH TỐ', sprite: 'e_boss2', color: '#c14dff', r: 58,
    hp: 3400, spd: 52, dmg: 30, xp: 110, rule: 'gravity',
    patterns: ['spiral', 'summon', 'laserSweep']
  },
  {
    name: 'NỒI ÁP SUẤT BẠO CHÚA', sprite: 'e_boss3', color: '#ffb02e', r: 62,
    hp: 6800, spd: 58, dmg: 36, xp: 200, rule: 'chained',
    patterns: ['radial', 'spiral', 'charge', 'summon']
  },
  {
    name: 'VUA KEM ỐC QUẾ', sprite: 'e_boss4', color: '#6fe6ff', r: 60,
    hp: 7000, spd: 50, dmg: 38, xp: 280, rule: 'frostbite',
    patterns: ['frostNova', 'radial', 'charge', 'summon']
  },
  {
    name: 'THẠCH GƯƠNG', sprite: 'e_boss5', color: '#3affa0', r: 54,
    hp: 7600, spd: 68, dmg: 40, xp: 340, rule: 'inverted',
    patterns: ['mirrorDash', 'spiral', 'laserSweep']
  },
  {
    name: 'PIZZA HẮC ÁM', sprite: 'e_boss6', color: '#ff6a2e', r: 66,
    hp: 8200, spd: 46, dmg: 42, xp: 420, rule: 'eclipse',
    patterns: ['sunburst', 'radial', 'spiral', 'summon']
  },
  {
    name: 'TỔ TRỨNG CÁ', sprite: 'e_boss7', color: '#ff2e88', r: 64,
    hp: 8800, spd: 54, dmg: 44, xp: 500, rule: 'hive',
    patterns: ['broodSurge', 'radial', 'charge']
  },
  {
    name: 'BÁNH KEM VÔ TẬN', sprite: 'e_boss8', color: '#eafcff', r: 70,
    hp: 9600, spd: 62, dmg: 48, xp: 640, rule: 'collapse',
    patterns: ['laserCross', 'spiral', 'radial', 'charge', 'summon']
  }
];
