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
      g.moveTo(-r * .62, -r * .5); g.lineTo(-r * .18, -r * .62);
      g.lineTo(r * .3, r * .04); g.lineTo(-r * .16, r * .3);
      g.closePath();
      g.fillStyle = 'rgba(37,244,238,.22)'; g.fill();
      g.strokeStyle = '#25f4ee'; g.lineWidth = 2.6; g.stroke();
      g.strokeStyle = '#eafcff'; g.lineWidth = 3.4; g.lineCap = 'round';
      g.beginPath(); g.moveTo(r * .26, r * .1); g.lineTo(r * .46, r * .22); g.stroke();
      g.fillStyle = '#fff6e0';                      // ba giọt kem bay ra
      for (let i = 0; i < 3; i++) {
        g.beginPath(); g.arc(r * (.56 + i * .14), r * (.3 + i * .16), r * (.13 - i * .03), 0, TAU); g.fill();
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
      g.moveTo(-r * .26, r * .55); g.lineTo(-r * .26, -r * .2);
      g.quadraticCurveTo(-r * .26, -r * .46, 0, -r * .46);
      g.quadraticCurveTo(r * .26, -r * .46, r * .26, -r * .2);
      g.lineTo(r * .26, r * .55);
      g.closePath();
      g.fillStyle = 'rgba(255,201,60,.22)'; g.fill();
      g.strokeStyle = '#ffc93c'; g.lineWidth = 2.6; g.stroke();
      g.fillStyle = '#fff2c4';                      // nắp có lỗ
      g.fillRect(-r * .3, -r * .62, r * .6, r * .18);
      g.restore();
      g.fillStyle = '#5a3a1a';                      // hạt tiêu bắn ra
      for (let i = 0; i < 5; i++) {
        const a = -.9 + i * .32;
        g.beginPath(); g.arc(Math.cos(a) * r * .74, Math.sin(a) * r * .74 - r * .1, r * .07, 0, TAU); g.fill();
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
      g.strokeStyle = '#25f4ee'; g.lineWidth = 3;
      g.beginPath(); g.arc(0, 0, r * .5, 0, TAU); g.setLineDash([5, 6]); g.stroke(); g.setLineDash([]);
      for (let i = 0; i < 3; i++) {
        const a = i / 3 * TAU;
        g.save(); g.translate(Math.cos(a) * r * .5, Math.sin(a) * r * .5); g.rotate(a + Math.PI / 2);
        g.fillStyle = '#eafcff';                    // lưỡi
        g.beginPath();
        g.moveTo(-r * .2, -r * .1); g.lineTo(r * .2, -r * .1);
        g.lineTo(r * .2, r * .04); g.lineTo(-r * .2, r * .1);
        g.closePath(); g.fill();
        g.fillStyle = '#3a2a12';                    // cán
        g.fillRect(-r * .32, -r * .05, r * .12, r * .1);
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
      g.strokeStyle = '#c9a8ff'; g.lineWidth = 3.2; g.lineCap = 'round';
      g.beginPath(); g.moveTo(r * .1, r * .66); g.lineTo(r * .1, r * .1); g.stroke();
      g.lineWidth = 2.6;
      for (let i = -2; i <= 2; i++) {               // các vòng dây
        g.beginPath();
        g.moveTo(r * .1, r * .1);
        g.quadraticCurveTo(r * (.1 + i * .28), -r * .3, r * .1, -r * .64);
        g.stroke();
      }
      g.fillStyle = '#ffe23c';                      // tia điện
      g.beginPath();
      g.moveTo(-r * .34, -r * .66); g.lineTo(-r * .64, -r * .18); g.lineTo(-r * .42, -r * .18);
      g.lineTo(-r * .58, r * .3); g.lineTo(-r * .18, -r * .3); g.lineTo(-r * .4, -r * .3);
      g.closePath(); g.fill();
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
      g.beginPath();
      g.moveTo(-r * .42, r * .58); g.lineTo(-r * .3, -r * .18);
      g.lineTo(r * .3, -r * .18); g.lineTo(r * .42, r * .58);
      g.closePath();
      g.fillStyle = '#f0e2c4'; g.fill();
      g.strokeStyle = '#ffb02e'; g.lineWidth = 2.6; g.stroke();
      g.strokeStyle = '#c9a86b'; g.lineWidth = 2.4;  // dây buộc
      g.beginPath(); g.moveTo(-r * .32, -r * .1); g.lineTo(r * .32, -r * .1); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.85)';         // bột bung lên
      g.beginPath(); g.arc(-r * .1, -r * .42, r * .14, 0, TAU); g.fill();
      g.beginPath(); g.arc(r * .18, -r * .58, r * .1, 0, TAU); g.fill();
      g.beginPath(); g.arc(-r * .34, -r * .62, r * .08, 0, TAU); g.fill();
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
      g.beginPath();                                // bình gas
      g.moveTo(-r * .66, r * .5); g.lineTo(-r * .66, -r * .06);
      g.lineTo(-r * .3, -r * .06); g.lineTo(-r * .3, r * .5);
      g.closePath();
      g.fillStyle = 'rgba(255,46,136,.25)'; g.fill();
      g.strokeStyle = '#ff2e88'; g.lineWidth = 2.4; g.stroke();
      g.strokeStyle = '#ffd2e6'; g.lineWidth = r * .14; g.lineCap = 'butt';
      g.beginPath(); g.moveTo(-r * .48, -r * .08); g.lineTo(-r * .12, -r * .34); g.stroke();
      const grd = g.createLinearGradient(-r * .1, 0, r * .8, 0);   // ngọn lửa
      grd.addColorStop(0, '#ffffff');
      grd.addColorStop(.45, '#ff8ec0');
      grd.addColorStop(1, 'rgba(255,46,136,0)');
      g.fillStyle = grd;
      g.beginPath();
      g.moveTo(-r * .1, -r * .5); g.lineTo(r * .84, -r * .3);
      g.lineTo(r * .84, -r * .16); g.lineTo(-r * .1, -r * .18);
      g.closePath(); g.fill();
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
      g.moveTo(-r * .3, r * .58); g.lineTo(-r * .3, -r * .3);
      g.quadraticCurveTo(-r * .3, -r * .52, 0, -r * .52);
      g.quadraticCurveTo(r * .3, -r * .52, r * .3, -r * .3);
      g.lineTo(r * .3, r * .58);
      g.closePath();
      g.fillStyle = 'rgba(111,230,255,.22)'; g.fill();
      g.strokeStyle = '#6fe6ff'; g.lineWidth = 2.6; g.stroke();
      g.fillStyle = '#d6f6ff'; g.fillRect(-r * .12, -r * .68, r * .24, r * .18);
      g.strokeStyle = '#eafcff'; g.lineWidth = 2.2; g.lineCap = 'round';
      for (let i = 0; i < 3; i++) {                 // bông tuyết toả ra
        const a = -1.9 + i * .5;
        const x = Math.cos(a) * r * .72, y = Math.sin(a) * r * .72;
        for (let k = 0; k < 3; k++) {
          const b = k / 3 * Math.PI;
          g.beginPath();
          g.moveTo(x - Math.cos(b) * r * .12, y - Math.sin(b) * r * .12);
          g.lineTo(x + Math.cos(b) * r * .12, y + Math.sin(b) * r * .12);
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
      g.beginPath(); g.ellipse(r * .12, 0, r * .5, r * .24, 0, 0, TAU);
      g.fillStyle = '#ff8f6b'; g.fill();
      g.strokeStyle = '#ff2e88'; g.lineWidth = 2.4; g.stroke();
      g.strokeStyle = 'rgba(120,36,14,.7)'; g.lineWidth = 2;    // vết nướng
      for (let i = -1; i <= 1; i++) {
        g.beginPath(); g.moveTo(r * (.12 + i * .22), -r * .2); g.lineTo(r * (.2 + i * .22), r * .2); g.stroke();
      }
      g.strokeStyle = '#ffb02e'; g.lineWidth = 4; g.lineCap = 'round';
      g.beginPath(); g.moveTo(-r * .42, 0); g.lineTo(-r * .82, 0); g.stroke();
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
      g.strokeStyle = '#b6ff3a'; g.lineWidth = 2.4;
      g.beginPath(); g.arc(0, 0, r * .68, 0, TAU); g.stroke();
      g.strokeStyle = '#ff8a3c'; g.lineWidth = r * .12; g.lineCap = 'round';
      for (let i = 0; i < 3; i++) {                 // dây điện trở uốn khúc
        const rr = r * (.2 + i * .18);
        g.beginPath(); g.arc(0, 0, rr, .3, TAU - .3); g.stroke();
      }
      g.fillStyle = '#ffe23c'; g.beginPath(); g.arc(0, 0, r * .1, 0, TAU); g.fill();
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
      g.beginPath(); g.ellipse(0, 0, r * .66, r * .5, 0, 0, TAU);
      g.fillStyle = 'rgba(234,252,255,.9)'; g.fill();
      g.strokeStyle = '#8ad8ff'; g.lineWidth = 2.2; g.stroke();
      g.beginPath(); g.ellipse(0, 0, r * .38, r * .28, 0, 0, TAU);
      g.strokeStyle = 'rgba(120,190,230,.8)'; g.lineWidth = 1.8; g.stroke();
      g.strokeStyle = 'rgba(234,252,255,.55)'; g.lineWidth = 2.4; g.lineCap = 'round';
      for (let i = -1; i <= 1; i++) {
        g.beginPath(); g.moveTo(-r * .78, i * r * .26); g.lineTo(-r * .96, i * r * .26); g.stroke();
      }
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
   Số liệu (`desc`, `apply`, `max`, `color`) y hệt bản gốc. Chỉ đổi TÊN và BIỂU TƯỢNG. */
const PASSIVES = {
  pow: {
    name: 'ỚT HIỂM', color: '#ff4d5e', max: 5,
    desc: lv => `Sát thương <em>+${lv * 12}%</em>`,
    apply: (s, lv) => { s.damage += .12 * lv; },
    icon(g, r) {                                    // quả ớt + cuống xanh
      g.beginPath();
      g.moveTo(r * .1, -r * .3);
      g.bezierCurveTo(r * .55, -r * .05, r * .35, r * .6, -r * .05, r * .6);
      g.bezierCurveTo(-r * .3, r * .6, -r * .3, r * .1, r * .1, -r * .3);
      g.fillStyle = '#ff4d5e'; g.fill();
      g.strokeStyle = '#ff8a95'; g.lineWidth = 2; g.stroke();
      g.strokeStyle = '#3affa0'; g.lineWidth = 3.4; g.lineCap = 'round';
      g.beginPath(); g.moveTo(r * .08, -r * .28); g.lineTo(-r * .18, -r * .62); g.stroke();
    }
  },
  haste: {
    name: 'ĐỒNG HỒ BẾP', color: '#25f4ee', max: 5,
    desc: lv => `Tốc độ tấn công <em>+${lv * 11}%</em>`,
    apply: (s, lv) => { s.haste += .11 * lv; },
    icon(g, r) {                                    // đồng hồ hẹn giờ vặn tay
      g.strokeStyle = '#25f4ee'; g.lineWidth = 2.8;
      g.beginPath(); g.arc(0, r * .08, r * .55, 0, TAU); g.stroke();
      g.fillStyle = 'rgba(37,244,238,.2)'; g.fill();
      g.lineWidth = 3; g.lineCap = 'round';
      g.beginPath(); g.moveTo(0, r * .08); g.lineTo(0, -r * .3); g.stroke();
      g.beginPath(); g.moveTo(0, r * .08); g.lineTo(r * .3, r * .2); g.stroke();
      g.lineWidth = 4;                              // núm vặn trên đỉnh
      g.beginPath(); g.moveTo(-r * .16, -r * .58); g.lineTo(r * .16, -r * .58); g.stroke();
    }
  },
  speed: {
    name: 'GIÀY CHỐNG TRƯỢT', color: '#b6ff3a', max: 5,
    desc: lv => `Tốc độ di chuyển <em>+${lv * 8}%</em>`,
    apply: (s, lv) => { s.moveSpeed += .08 * lv; },
    icon(g, r) {
      g.strokeStyle = '#b6ff3a'; g.lineWidth = 3.4; g.lineCap = 'round';
      for (let i = -1; i <= 1; i++) {
        g.beginPath(); g.moveTo(-r * .6, i * r * .3); g.lineTo(r * .2 - Math.abs(i) * r * .2, i * r * .3); g.stroke();
      }
      g.beginPath(); g.moveTo(r * .1, -r * .45); g.lineTo(r * .62, 0); g.lineTo(r * .1, r * .45); g.stroke();
    }
  },
  hp: {
    name: 'Ổ BÁNH MÌ', color: '#ff4d6b', max: 5,
    desc: lv => `Máu tối đa <em>+${lv * 22}</em>`,
    apply: (s, lv) => { s.maxHp += 22 * lv; },
    icon(g, r) {                                    // ổ bánh mì nứt vỏ
      g.beginPath();
      g.moveTo(-r * .6, r * .38);
      g.quadraticCurveTo(-r * .6, -r * .5, 0, -r * .5);
      g.quadraticCurveTo(r * .6, -r * .5, r * .6, r * .38);
      g.closePath();
      g.fillStyle = '#e8a05c'; g.fill();
      g.strokeStyle = '#ff4d6b'; g.lineWidth = 2.4; g.stroke();
      g.strokeStyle = '#ffd0a8'; g.lineWidth = 2.4; g.lineCap = 'round';
      for (let i = -1; i <= 1; i++) {
        g.beginPath(); g.moveTo(i * r * .3 - r * .1, -r * .3); g.lineTo(i * r * .3 + r * .12, r * .18); g.stroke();
      }
    }
  },
  armor: {
    name: 'BAO TAY LÒ', color: '#8fa8ff', max: 5,
    desc: lv => `Giáp <em>+${lv * 2}</em> (giảm sát thương nhận)`,
    apply: (s, lv) => { s.armor += 2 * lv; },
    icon(g, r) {                                    // bao tay bắc nồi
      g.beginPath();
      g.moveTo(-r * .34, r * .62); g.lineTo(-r * .34, -r * .1);
      g.quadraticCurveTo(-r * .34, -r * .62, r * .06, -r * .62);
      g.quadraticCurveTo(r * .4, -r * .62, r * .4, -r * .2);
      g.lineTo(r * .4, r * .62);
      g.closePath();
      g.fillStyle = 'rgba(143,168,255,.35)'; g.fill();
      g.strokeStyle = '#8fa8ff'; g.lineWidth = 2.6; g.stroke();
      g.beginPath();                                // ngón cái
      g.moveTo(-r * .34, r * .1); g.quadraticCurveTo(-r * .7, r * .1, -r * .62, r * .5); g.stroke();
      g.strokeStyle = '#d6e0ff'; g.lineWidth = 2.2;  // viền bo
      g.beginPath(); g.moveTo(-r * .34, r * .44); g.lineTo(r * .4, r * .44); g.stroke();
    }
  },
  magnet: {
    name: 'CÁI VÁ LỚN', color: '#4de1ff', max: 5,
    desc: lv => `Tầm hút vật phẩm <em>+${lv * 40}</em>`,
    apply: (s, lv) => { s.pickup += 40 * lv; },
    icon(g, r) {                                    // cái vá múc canh
      g.beginPath(); g.arc(0, r * .24, r * .38, 0, Math.PI);
      g.fillStyle = 'rgba(77,225,255,.35)'; g.fill();
      g.strokeStyle = '#4de1ff'; g.lineWidth = 2.8; g.stroke();
      g.lineWidth = r * .16; g.lineCap = 'round';
      g.beginPath(); g.moveTo(0, r * .24); g.lineTo(0, -r * .5); g.stroke();
      g.strokeStyle = '#ff4d5e'; g.lineWidth = r * .12;
      g.beginPath(); g.moveTo(-r * .16, -r * .54); g.lineTo(r * .16, -r * .54); g.stroke();
    }
  },
  crit: {
    name: 'DAO MÀI SẮC', color: '#ffc93c', max: 5,
    desc: lv => `Tỉ lệ chí mạng <em>+${lv * 8}%</em>`,
    apply: (s, lv) => { s.crit += .08 * lv; },
    icon(g, r) {                                    // dao gọt + tia sáng lưỡi
      g.beginPath();
      g.moveTo(-r * .55, r * .3); g.lineTo(r * .3, -r * .55);
      g.lineTo(r * .5, -r * .3); g.lineTo(-r * .3, r * .5);
      g.closePath();
      g.fillStyle = 'rgba(255,240,196,.9)'; g.fill();
      g.strokeStyle = '#ffc93c'; g.lineWidth = 2.2; g.stroke();
      g.fillStyle = '#3a2a12';                       // cán dao
      g.save(); g.rotate(-Math.PI / 4);
      g.fillRect(-r * .82, -r * .1, r * .3, r * .2);
      g.restore();
      g.strokeStyle = '#fff'; g.lineWidth = 2; g.lineCap = 'round';
      g.beginPath(); g.moveTo(r * .34, -r * .68); g.lineTo(r * .52, -r * .78); g.stroke();
    }
  },
  critd: {
    name: 'BÚA DẦN THỊT', color: '#ff8a3c', max: 5,
    desc: lv => `Sát thương chí mạng <em>+${lv * 30}%</em>`,
    apply: (s, lv) => { s.critDmg += .3 * lv; },
    icon(g, r) {                                    // búa dần thịt mặt gai
      g.fillStyle = 'rgba(255,138,60,.3)'; g.strokeStyle = '#ff8a3c'; g.lineWidth = 2.6;
      g.beginPath(); g.rect(-r * .55, -r * .6, r * 1.1, r * .5); g.fill(); g.stroke();
      g.fillStyle = '#ffd9a8';
      for (let x = -1; x <= 1; x++) {
        for (let y = 0; y <= 1; y++) {
          g.beginPath(); g.arc(x * r * .3, -r * .48 + y * r * .24, r * .07, 0, TAU); g.fill();
        }
      }
      g.strokeStyle = '#ff8a3c'; g.lineWidth = r * .18; g.lineCap = 'round';
      g.beginPath(); g.moveTo(0, -r * .1); g.lineTo(0, r * .62); g.stroke();
    }
  },
  regen: {
    name: 'NƯỚC DÙNG HẦM', color: '#3affa0', max: 5,
    desc: lv => `Hồi <em>${(lv * .9).toFixed(1)}</em> máu mỗi giây`,
    apply: (s, lv) => { s.regen += .9 * lv; },
    icon(g, r) {                                    // tô nước dùng bốc khói
      g.beginPath(); g.arc(0, r * .1, r * .55, 0, Math.PI);
      g.fillStyle = 'rgba(58,255,160,.3)'; g.fill();
      g.strokeStyle = '#3affa0'; g.lineWidth = 2.8; g.stroke();
      g.beginPath(); g.moveTo(-r * .62, r * .1); g.lineTo(r * .62, r * .1); g.stroke();
      g.strokeStyle = '#bfffe0'; g.lineWidth = 2.2; g.lineCap = 'round';
      for (let i = -1; i <= 1; i++) {               // hơi nóng
        g.beginPath();
        g.moveTo(i * r * .28, -r * .16);
        g.quadraticCurveTo(i * r * .28 + r * .16, -r * .38, i * r * .28, -r * .62);
        g.stroke();
      }
    }
  },
  area: {
    name: 'CHẢO ĐẠI', color: '#9d6bff', max: 5,
    desc: lv => `Phạm vi kỹ năng <em>+${lv * 14}%</em>`,
    apply: (s, lv) => { s.area += .14 * lv; },
    icon(g, r) {                                    // chảo to nhìn từ trên, có cán
      g.beginPath(); g.arc(-r * .08, 0, r * .5, 0, TAU);
      g.fillStyle = 'rgba(157,107,255,.28)'; g.fill();
      g.strokeStyle = '#9d6bff'; g.lineWidth = 2.8; g.stroke();
      g.beginPath(); g.arc(-r * .08, 0, r * .32, 0, TAU);
      g.strokeStyle = 'rgba(217,196,255,.7)'; g.lineWidth = 2; g.stroke();
      g.strokeStyle = '#9d6bff'; g.lineWidth = r * .16; g.lineCap = 'round';
      g.beginPath(); g.moveTo(r * .4, 0); g.lineTo(r * .86, 0); g.stroke();
    }
  },
  proj: {
    name: 'THÊM MỘT SUẤT', color: '#ffc93c', max: 3,
    desc: lv => `Tất cả vũ khí <em>+${lv}</em> đạn`,
    apply: (s, lv) => { s.proj += lv; },
    icon(g, r) {                                    // ba cái đĩa xếp chồng
      g.strokeStyle = '#ffc93c'; g.lineWidth = 2.4;
      for (let i = -1; i <= 1; i++) {
        g.beginPath(); g.ellipse(0, i * r * .3 + r * .1, r * .55 - Math.abs(i) * r * .06, r * .17, 0, 0, TAU);
        g.fillStyle = 'rgba(255,201,60,.22)'; g.fill(); g.stroke();
      }
      g.fillStyle = '#fff2c4'; g.font = 'bold ' + Math.round(r * .5) + 'px sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('+', 0, -r * .55);
    }
  },
  lifesteal: {
    name: 'XỐT CÀ CHUA', color: '#ff2e88', max: 5,
    desc: lv => `Hút <em>${(lv * 1.4).toFixed(1)}%</em> sát thương thành máu`,
    apply: (s, lv) => { s.lifesteal += .014 * lv; },
    icon(g, r) {                                    // giọt xốt
      g.fillStyle = '#ff2e88';
      g.beginPath();
      g.moveTo(0, -r * .62);
      g.bezierCurveTo(r * .55, r * .05, r * .38, r * .62, 0, r * .62);
      g.bezierCurveTo(-r * .38, r * .62, -r * .55, r * .05, 0, -r * .62);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,.6)';
      g.beginPath(); g.ellipse(-r * .16, r * .1, r * .1, r * .18, -.4, 0, TAU); g.fill();
    }
  },
  dodge: {
    name: 'TẠP DỀ TRƠN', color: '#8fa8ff', max: 5,
    desc: lv => `Né tránh <em>+${lv * 6}%</em>`,
    apply: (s, lv) => { s.dodge += .06 * lv; },
    icon(g, r) {                                    // cái tạp dề
      g.fillStyle = 'rgba(143,168,255,.35)'; g.strokeStyle = '#8fa8ff'; g.lineWidth = 2.4;
      g.beginPath();
      g.moveTo(-r * .22, -r * .5); g.lineTo(r * .22, -r * .5);
      g.lineTo(r * .3, -r * .16); g.lineTo(r * .46, r * .58);
      g.lineTo(-r * .46, r * .58); g.lineTo(-r * .3, -r * .16);
      g.closePath(); g.fill(); g.stroke();
      g.lineWidth = 2; g.lineCap = 'round';          // dây buộc cổ
      g.beginPath(); g.moveTo(-r * .22, -r * .5); g.lineTo(-r * .5, -r * .68); g.stroke();
      g.beginPath(); g.moveTo(r * .22, -r * .5); g.lineTo(r * .5, -r * .68); g.stroke();
    }
  },
  xp: {
    name: 'SỔ CÔNG THỨC', color: '#25f4ee', max: 5,
    desc: lv => `Kinh nghiệm nhận được <em>+${lv * 16}%</em>`,
    apply: (s, lv) => { s.xpGain += .16 * lv; },
    icon(g, r) {                                    // quyển sổ mở
      g.fillStyle = 'rgba(37,244,238,.25)'; g.strokeStyle = '#25f4ee'; g.lineWidth = 2.2;
      g.beginPath();
      g.moveTo(-r * .55, -r * .45); g.lineTo(0, -r * .3); g.lineTo(r * .55, -r * .45);
      g.lineTo(r * .55, r * .5); g.lineTo(0, r * .35); g.lineTo(-r * .55, r * .5);
      g.closePath(); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(0, -r * .3); g.lineTo(0, r * .35); g.stroke();
      g.strokeStyle = 'rgba(200,250,255,.6)'; g.lineWidth = 1.6;
      for (let i = 0; i < 3; i++) {                  // dòng chữ trong công thức
        const y = -r * .12 + i * r * .18;
        g.beginPath(); g.moveTo(-r * .42, y); g.lineTo(-r * .1, y + r * .04); g.stroke();
        g.beginPath(); g.moveTo(r * .1, y + r * .04); g.lineTo(r * .42, y); g.stroke();
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
