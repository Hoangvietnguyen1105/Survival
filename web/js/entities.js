/* ============ NEON HORDE — entities ============ */
'use strict';

let _uid = 1;

/* ===================== PLAYER ===================== */
function createPlayer(charId) {
  const ch = CHARACTERS.find(c => c.id === charId) || CHARACTERS[0];
  return {
    ch, x: 0, y: 0, vx: 0, vy: 0, r: 14,
    face: -Math.PI / 2, tilt: 0,
    hp: 100, maxHp: 100,
    dashT: 0, dashCd: 0, dashDirX: 1, dashDirY: 0,
    iframe: 0, hitCd: 0,
    level: 1, xp: 0, xpNext: 5,
    blades: [], bladeAng: 0,
    walkT: 0, trailT: 0,
    afterimg: []
  };
}

function updatePlayer(G, dt) {
  const p = G.player, S = G.stats;
  Input.update();

  /* ===== LUẬT ĐẤU TRƯỜNG =====
   * G.bossRule chỉ khác null trong lúc đang đánh trùm. Mọi luật đều bóp
   * DI CHUYỂN / TẦM NHÌN / HỒI MÁU — không luật nào đụng vào vũ khí, vì bắn
   * là tự động: khoá vũ khí thì người chơi chỉ còn ngồi nhìn. */
  const rule = G.bossRule;

  /* ĐẢO CHIỀU: lật ngay sau khi đọc input để đi, lướt, hướng mặt cùng lật. */
  if (rule === 'inverted') { Input.dx = -Input.dx; Input.dy = -Input.dy; }

  /* --- dash --- */
  p.dashCd = Math.max(0, p.dashCd - dt);
  const wantDash = Input.consumeDash();      // luôn phải gọi để xoá đệm phím
  if (wantDash && rule === 'chained' && p.dashCd <= 0 && !G.paused) {
    // XIỀNG XÍCH: báo cho người chơi biết là bị khoá, đừng im lặng nuốt phím
    Particles.ring(p.x, p.y, 34, '#ffb02e', .22, 3);
    Sfx.tone({ f: 150, f2: 60, d: .14, type: 'square', v: .1, exp: 1 });
    p.dashCd = .35;
  }
  if (wantDash && rule !== 'chained' && p.dashCd <= 0 && !G.paused) {
    let dx = Input.dx, dy = Input.dy;
    if (!dx && !dy) { dx = Math.cos(p.face); dy = Math.sin(p.face); }
    p.dashDirX = dx; p.dashDirY = dy;
    p.dashT = .19; p.dashCd = 1.5; p.iframe = Math.max(p.iframe, .28);
    Sfx.dash();
    Cam.addShake(3);
    Particles.burst(p.x, p.y, 16, '#25f4ee', { speed: 300, life: .4, size: 5 });
    Particles.ring(p.x, p.y, 46, '#25f4ee', .3, 3);
  }

  // Ấn Phượng Hoàng tầng 3: máu thấp thì chạy nhanh hơn
  let spd = 218 * S.moveSpeed * (G.rage ? 1.35 : 1);
  if (rule === 'frostbite') spd *= .65;      // BĂNG GIÁ
  let mx, my;
  if (p.dashT > 0) {
    p.dashT -= dt;
    mx = p.dashDirX * spd * 3.6;
    my = p.dashDirY * spd * 3.6;
    p.afterimg.push({ x: p.x, y: p.y, a: p.face, life: .3 });
    Particles.trail(p.x + rand(-8, 8), p.y + rand(-8, 8), '#25f4ee', 5, .28);
  } else {
    mx = Input.dx * spd;
    my = Input.dy * spd;
  }

  /* HẤP LỰC: trùm kéo người chơi về phía nó. 96 so với tốc gốc 218 —
     đủ để không đứng yên được, nhưng vẫn thoát ra được nếu chủ động chạy. */
  if (rule === 'gravity' && G.bossActive && !G.bossActive.dead) {
    const b = G.bossActive;
    const ga = Math.atan2(b.y - p.y, b.x - p.x);
    mx += Math.cos(ga) * 96;
    my += Math.sin(ga) * 96;
  }

  const k = 1 - Math.pow(.00003, dt);
  p.vx = lerp(p.vx, mx, k); p.vy = lerp(p.vy, my, k);
  p.x += p.vx * dt; p.y += p.vy * dt;

  // arena bounds
  const B = G.arena - p.r;
  if (p.x < -B) { p.x = -B; p.vx = 0; }
  if (p.x > B) { p.x = B; p.vx = 0; }
  if (p.y < -B) { p.y = -B; p.vy = 0; }
  if (p.y > B) { p.y = B; p.vy = 0; }

  const sp = Math.hypot(p.vx, p.vy);
  if (sp > 12) {
    p.face = Math.atan2(p.vy, p.vx);
    p.walkT += dt * sp * .045;
  }
  p.tilt = lerp(p.tilt, clamp(p.vx / 700, -.35, .35), 1 - Math.pow(.001, dt));

  // afterimages decay
  for (let i = p.afterimg.length - 1; i >= 0; i--) {
    p.afterimg[i].life -= dt;
    if (p.afterimg[i].life <= 0) p.afterimg.splice(i, 1);
  }

  p.iframe = Math.max(0, p.iframe - dt);
  p.hitCd = Math.max(0, p.hitCd - dt);

  // regen — KHÁT MÁU chặn hồi máu tự động (tim rơi ra vẫn ăn được)
  if (S.regen > 0 && p.hp < p.maxHp && rule !== 'bloodthirst') {
    p.hp = Math.min(p.maxHp, p.hp + S.regen * dt);
  }

  // engine trail
  p.trailT -= dt;
  if (sp > 40 && p.trailT <= 0) {
    p.trailT = .05;
    Particles.emit({
      x: p.x - Math.cos(p.face) * 10, y: p.y - Math.sin(p.face) * 10,
      vx: -p.vx * .12 + rand(-20, 20), vy: -p.vy * .12 + rand(-20, 20),
      life: .3, size: 4, color: p.ch.color, drag: .9
    });
  }
}

function drawPlayer(g, G) {
  const p = G.player;
  const spr = Art.get(p.ch.sprite);
  const sc = (p.r * 2.5) / spr.width;

  // shadow
  const sh = Art.get('shadow');
  g.globalAlpha = .5;
  g.drawImage(sh, p.x - 22, p.y - 8, 44, 22);
  g.globalAlpha = 1;

  // afterimages
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (const a of p.afterimg) {
    g.globalAlpha = a.life * 1.3;
    g.save(); g.translate(a.x, a.y); g.rotate(a.a + Math.PI / 2); g.scale(sc, sc);
    g.drawImage(spr, -spr.width / 2, -spr.height / 2);
    g.restore();
  }
  g.restore();

  // aura ring while iframe
  if (p.iframe > 0) {
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = 'rgba(120,240,255,' + (.35 + Math.sin(G.time * 40) * .2) + ')';
    g.lineWidth = 3;
    g.beginPath(); g.arc(p.x, p.y, p.r + 9, 0, TAU); g.stroke();
    g.restore();
  }

  const bob = Math.sin(p.walkT) * 1.6;
  g.save();
  g.translate(p.x, p.y + bob);
  g.rotate(p.face + Math.PI / 2 + p.tilt);
  g.scale(sc, sc);
  g.drawImage(spr, -spr.width / 2, -spr.height / 2);
  g.restore();

  // blades
  const rings = bladeRings(G, p);
  if (rings) {
    const spr2 = Art.get('b_blade');
    for (const ring of rings.list) {
      for (let i = 0; i < ring.n; i++) {
        const a = ring.ang + i / ring.n * TAU;
        const bx = p.x + Math.cos(a) * ring.rad, by = p.y + Math.sin(a) * ring.rad;
        const s = ring.size / spr2.width;
        g.save(); g.translate(bx, by); g.rotate(a + Math.PI / 2); g.scale(s, s);
        g.drawImage(spr2, -spr2.width / 2, -spr2.height / 2);
        g.restore();
      }
    }
  }
}

/**
 * Vị trí các lưỡi kiếm quay quanh người chơi.
 * Bản tiến hoá THIÊN LUÂN có HAI vòng quay ngược chiều nhau.
 */
function bladeRings(G, p) {
  const bw = G.weapons.find(w => w.id === 'blade');
  if (!bw) return null;
  const bs = WEAPONS.blade.stat(bw.lv);
  const n = bs.n + G.stats.proj + (bw.evolved ? 2 : 0);
  const rad = bs.rad * G.stats.area * (bw.evolved ? 1.15 : 1);
  const list = [{
    n, rad, ang: p.bladeAng,
    size: 26 * G.stats.area * (bw.evolved ? 1.1 : 1),
    hitR: 17 * G.stats.area * (bw.evolved ? 1.1 : 1)
  }];
  // THIÊN LUÂN: vòng trong ÍT lưỡi hơn vòng ngoài — hai vòng đầy đủ thì số lần
  // chạm tăng gấp đôi, cộng với sóng xung kích là thành cỗ máy xay quá mạnh
  if (bw.evolved) list.push({
    n: Math.max(2, n - 2), rad: rad * .55, ang: -p.bladeAng * 1.45,
    size: 18 * G.stats.area, hitR: 12 * G.stats.area
  });
  return { bw, bs, list };
}

/* ===================== ENEMY ===================== */
function resetEnemy(e, o) {
  const d = o.def;
  e.uid = _uid++;
  e.def = d; e.type = o.type;
  e.x = o.x; e.y = o.y; e.vx = 0; e.vy = 0;
  e.r = d.r * (o.scale || 1);
  e.scale = o.scale || 1;
  e.maxHp = o.hp; e.hp = o.hp;
  e.spd = d.spd * (o.spdMul || 1);
  e.dmg = o.dmg;
  e.xp = o.xp;
  e.sprite = d.sprite;
  e.color = d.color;
  e.flash = 0; e.slowT = 0; e.slowAmt = 0; e.stunT = 0;
  e.hitCd = 0; e.bladeCd = 0; e.ai = d.ai;
  e.elite = !!o.elite;
  e.boss = !!o.boss; e.bossDef = o.bossDef || null;
  e.state = 0; e.t = rand(3); e.t2 = 0; e.ang = rand(TAU);
  e.rot = 0; e.knockRes = d.knockRes || 0;
  e.pattern = 0; e.patternT = 2.5; e.swept = 0;
  e.split = d.split || 0;
  e.name = o.name || '';
  e.spawnT = .35;
  e.dead = false;
}

function updateEnemy(G, e, dt) {
  const p = G.player;
  if (e.spawnT > 0) { e.spawnT -= dt; }
  e.flash = Math.max(0, e.flash - dt * 5);
  if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slowAmt = 0; }
  if (e.stunT > 0) {
    e.stunT -= dt;
    e.x += e.vx * dt; e.y += e.vy * dt;
    e.vx *= Math.pow(.001, dt); e.vy *= Math.pow(.001, dt);
    return;
  }
  e.hitCd = Math.max(0, e.hitCd - dt);
  e.t += dt;

  const slowMul = 1 - e.slowAmt;
  const spd = e.spd * slowMul;
  const a = angleTo(e.x, e.y, p.x, p.y);
  const d = dist(e.x, e.y, p.x, p.y);
  e.rot = a;

  let ax = 0, ay = 0;

  if (e.boss) {
    updateBoss(G, e, dt, a, d, spd);
    return;
  }

  switch (e.ai) {
    case 'shoot': {
      const rng = e.def.range;
      if (d > rng) { ax = Math.cos(a) * spd; ay = Math.sin(a) * spd; }
      else if (d < rng * .7) { ax = -Math.cos(a) * spd * .8; ay = -Math.sin(a) * spd * .8; }
      else {
        ax = Math.cos(a + Math.PI / 2) * spd * .7;
        ay = Math.sin(a + Math.PI / 2) * spd * .7;
      }
      e.t2 -= dt;
      if (e.t2 <= 0 && d < rng * 1.4 && e.spawnT <= 0) {
        e.t2 = 2.2 + rand(.6);
        G.spawnEBullet(e.x, e.y, a, 250, e.dmg * .8, '#3ce0ff');
        Sfx.tone({ f: 520, f2: 260, d: .12, type: 'square', v: .06, exp: 1 });
      }
      break;
    }
    case 'charge': {
      if (e.state === 0) {
        ax = Math.cos(a) * spd * .55; ay = Math.sin(a) * spd * .55;
        if (d < 260) { e.state = 1; e.t2 = .7; e.ang = a; }
      } else if (e.state === 1) {           // wind-up
        e.t2 -= dt;
        ax = -Math.cos(e.ang) * 40; ay = -Math.sin(e.ang) * 40;
        if (e.t2 <= 0) {
          e.state = 2; e.t2 = .55;
          Particles.ring(e.x, e.y, 34, '#ffe23c', .3, 3);
        }
      } else {                              // dash
        e.t2 -= dt;
        ax = Math.cos(e.ang) * spd * 6.5; ay = Math.sin(e.ang) * spd * 6.5;
        Particles.trail(e.x, e.y, '#ffe23c', 4, .22);
        if (e.t2 <= 0) { e.state = 0; e.t2 = 0; }
      }
      break;
    }
    case 'orbit': {
      const want = 130;
      const radial = (d - want) * 2.2;
      const tang = spd;
      ax = Math.cos(a) * clamp(radial, -spd, spd) + Math.cos(a + Math.PI / 2) * tang;
      ay = Math.sin(a) * clamp(radial, -spd, spd) + Math.sin(a + Math.PI / 2) * tang;
      break;
    }
    default: {                              // chase
      const wob = Math.sin(e.t * 2.4 + e.uid) * .28;
      ax = Math.cos(a + wob) * spd; ay = Math.sin(a + wob) * spd;
    }
  }

  // steering + knockback decay
  const k = 1 - Math.pow(.0006, dt);
  e.vx = lerp(e.vx, ax, k);
  e.vy = lerp(e.vy, ay, k);
  e.x += e.vx * dt; e.y += e.vy * dt;

  // arena clamp
  const B = G.arena - e.r;
  e.x = clamp(e.x, -B, B); e.y = clamp(e.y, -B, B);
}

function updateBoss(G, e, dt, a, d, spd) {
  const p = G.player;
  e.patternT -= dt;
  const pat = e.bossDef.patterns[e.pattern % e.bossDef.patterns.length];

  if (e.state === 0) {                       // approach
    const k = 1 - Math.pow(.0006, dt);
    e.vx = lerp(e.vx, Math.cos(a) * spd, k);
    e.vy = lerp(e.vy, Math.sin(a) * spd, k);
    if (e.patternT <= 0) {
      e.state = 1; e.t2 = 0; e.subCount = 0;
      e.telegraph = .6;
      Sfx.tone({ f: 90, f2: 200, d: .5, type: 'sawtooth', v: .16, exp: 1 });
    }
  } else {                                   // executing pattern
    if (e.telegraph > 0) {
      e.telegraph -= dt;
      e.vx *= Math.pow(.02, dt); e.vy *= Math.pow(.02, dt);
      if (e.telegraph <= 0) e.t2 = 0;
    } else {
      e.t2 += dt;
      let done = false;
      switch (pat) {
        case 'radial':
          if (e.t2 > .28) {
            e.t2 = 0; e.subCount++;
            const n = 14;
            for (let i = 0; i < n; i++) {
              const ang = i / n * TAU + e.subCount * .3;
              G.spawnEBullet(e.x, e.y, ang, 210, e.dmg * .55, e.color);
            }
            Sfx.tone({ f: 300, f2: 120, d: .16, type: 'square', v: .1, exp: 1 });
            Cam.addShake(3);
            if (e.subCount >= 4) done = true;
          }
          break;
        case 'spiral':
          if (e.t2 > .07) {
            e.t2 = 0; e.subCount++;
            for (let i = 0; i < 3; i++) {
              const ang = e.subCount * .42 + i / 3 * TAU;
              G.spawnEBullet(e.x, e.y, ang, 190, e.dmg * .45, e.color);
            }
            if (e.subCount >= 34) done = true;
          }
          break;
        case 'charge':
          if (e.subCount === 0) { e.ang = a; e.subCount = 1; e.t2 = 0; }
          e.vx = Math.cos(e.ang) * spd * 7.5;
          e.vy = Math.sin(e.ang) * spd * 7.5;
          Particles.trail(e.x, e.y, e.color, 9, .3);
          if (e.t2 > .8) done = true;
          break;
        case 'summon':
          if (e.t2 > .3) {
            e.t2 = 0; e.subCount++;
            for (let i = 0; i < 3; i++) {
              const ang = rand(TAU);
              G.spawnEnemy(pick(['swarm', 'grunt']),
                e.x + Math.cos(ang) * 70, e.y + Math.sin(ang) * 70);
            }
            Particles.ring(e.x, e.y, 90, e.color, .4, 4);
            if (e.subCount >= 3) done = true;
          }
          break;
        case 'laserSweep':
          if (e.subCount === 0) { e.ang = a - 1.1; e.subCount = 1; }
          e.ang += dt * 1.5;
          e.vx *= .9; e.vy *= .9;
          if (e.t2 > .1) {
            e.t2 = 0;
            G.spawnEBullet(e.x, e.y, e.ang, 320, e.dmg * .5, e.color);
            G.spawnEBullet(e.x, e.y, e.ang + Math.PI, 320, e.dmg * .5, e.color);
          }
          if (e.ang > a + 1.1 + 2.2) done = true;
          break;

        /* ---- SƯƠNG HÀN VƯƠNG: ba đợt sóng băng lan ra, đạn bay chậm nên
               phải luồn lách chứ không chạy thẳng thoát được ---- */
        case 'frostNova':
          e.vx *= Math.pow(.02, dt); e.vy *= Math.pow(.02, dt);
          if (e.t2 > .62) {
            e.t2 = 0; e.subCount++;
            const nF = 22;
            for (let i = 0; i < nF; i++) {
              const ang = i / nF * TAU + e.subCount * .14;
              G.spawnEBullet(e.x, e.y, ang, 120 + e.subCount * 22, e.dmg * .45, '#9beeff');
            }
            Particles.ring(e.x, e.y, 130 + e.subCount * 30, '#9beeff', .5, 5);
            Sfx.tone({ f: 900, f2: 240, d: .3, type: 'sine', v: .1, exp: 1 });
            if (e.subCount >= 3) done = true;
          }
          break;

        /* ---- NGHỊCH ẢNH: 4 cú lao liên tiếp, mỗi cú dừng lại nhả một
               vòng đạn tại chỗ — chỗ nó vừa đứng cũng nguy hiểm ---- */
        case 'mirrorDash':
          if (e.subCount === 0) { e.ang = a; e.subCount = 1; e.t2 = 0; }
          if (e.t2 < .40) {
            e.vx = Math.cos(e.ang) * spd * 8;
            e.vy = Math.sin(e.ang) * spd * 8;
            Particles.trail(e.x, e.y, e.color, 9, .3);
          } else {
            e.vx *= Math.pow(.02, dt); e.vy *= Math.pow(.02, dt);
            if (e.t2 > .60) {
              for (let i = 0; i < 7; i++) {
                G.spawnEBullet(e.x, e.y, i / 7 * TAU + e.subCount * .5, 210, e.dmg * .4, e.color);
              }
              Particles.ring(e.x, e.y, 74, e.color, .35, 4);
              Cam.addShake(3);
              e.subCount++; e.t2 = 0; e.ang = a;      // ngắm lại người chơi trước cú kế
              if (e.subCount > 4) done = true;
            }
          }
          break;

        /* ---- HẮC NHẬT: 4 vành lửa đồng tâm, vành sau nhanh hơn vành trước
               nên chúng dồn lại thành một bức tường đuổi theo ---- */
        case 'sunburst':
          e.vx *= Math.pow(.02, dt); e.vy *= Math.pow(.02, dt);
          if (e.t2 > .52) {
            e.t2 = 0; e.subCount++;
            const nS = 26;
            for (let i = 0; i < nS; i++) {
              const ang = i / nS * TAU + e.subCount * .12;
              G.spawnEBullet(e.x, e.y, ang, 145 + e.subCount * 40, e.dmg * .48, e.color);
            }
            Particles.ring(e.x, e.y, 120 + e.subCount * 44, e.color, .5, 6);
            Cam.addShake(5);
            Sfx.tone({ f: 220, f2: 66, d: .32, type: 'sawtooth', v: .13, exp: 1 });
            if (e.subCount >= 4) done = true;
          }
          break;

        /* ---- TRÙNG MẪU: đẻ ồ ạt. Cố ý trộn bomber + splitter để cộng hưởng
               với luật TÁCH BẦY của chính nó ---- */
        case 'broodSurge':
          e.vx *= Math.pow(.06, dt); e.vy *= Math.pow(.06, dt);
          if (e.t2 > .26) {
            e.t2 = 0; e.subCount++;
            for (let i = 0; i < 4; i++) {
              const ang = rand(TAU), rr = rand(60, 130);
              G.spawnEnemy(pick(['swarm', 'swarm', 'bomber', 'splitter']),
                e.x + Math.cos(ang) * rr, e.y + Math.sin(ang) * rr);
            }
            Particles.ring(e.x, e.y, 110, e.color, .35, 4);
            if (e.subCount >= 5) done = true;
          }
          break;

        /* ---- VÔ TẬN: chữ thập 4 tia quay tròn. Đếm góc đã quét bằng biến
               riêng, KHÔNG so với `a` — `a` đổi từng khung hình nên so kiểu
               đó thì lúc quét nửa vòng lúc quét ba vòng ---- */
        case 'laserCross':
          if (e.subCount === 0) { e.ang = a; e.subCount = 1; e.swept = 0; }
          e.ang += dt * 1.15; e.swept += dt * 1.15;
          e.vx *= .9; e.vy *= .9;
          if (e.t2 > .08) {
            e.t2 = 0;
            for (let i = 0; i < 4; i++) {
              G.spawnEBullet(e.x, e.y, e.ang + i / 4 * TAU, 340, e.dmg * .42, e.color);
            }
          }
          if (e.swept > TAU * .85) done = true;
          break;
      }
      if (done) {
        e.state = 0; e.pattern++; e.patternT = 3.2 + rand(1.4);
        e.subCount = 0;
      }
    }
  }

  e.x += e.vx * dt; e.y += e.vy * dt;
  const B = G.arena - e.r;
  e.x = clamp(e.x, -B, B); e.y = clamp(e.y, -B, B);

  // idle aura particles
  if (Math.random() < dt * 26) {
    const ang = rand(TAU), rr = e.r * rand(.8, 1.3);
    Particles.emit({
      x: e.x + Math.cos(ang) * rr, y: e.y + Math.sin(ang) * rr,
      vx: -Math.cos(ang) * 40, vy: -Math.sin(ang) * 40,
      life: .5, size: 4, color: e.color, drag: .93
    });
  }
}

function drawEnemy(g, G, e) {
  const key = e.flash > .04 ? null : e.sprite;
  const spr = key ? Art.get(key) : flashed(e.sprite);
  const sc = (e.r * 2.55) / Art.get(e.sprite).width;

  if (e.spawnT > 0) {
    // spawn telegraph
    const t = 1 - e.spawnT / .35;
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 1 - t;
    g.strokeStyle = e.color; g.lineWidth = 2.5;
    g.beginPath(); g.arc(e.x, e.y, e.r * (2.4 - t * 1.4), 0, TAU); g.stroke();
    g.restore();
  }

  g.save();
  g.translate(e.x, e.y);
  const wob = e.boss ? 1 + Math.sin(G.time * 2.2) * .04 : 1;
  g.rotate(e.rot + Math.PI / 2);
  g.scale(sc * wob, sc * wob * (e.spawnT > 0 ? .5 + .5 * (1 - e.spawnT / .35) : 1));

  if (e.elite) {
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = .5 + Math.sin(G.time * 5) * .2;
    g.drawImage(spr, -spr.width / 2 - 4, -spr.height / 2 - 4, spr.width + 8, spr.height + 8);
    g.restore();
  }
  if (e.slowAmt > 0) g.globalAlpha = 1;
  g.drawImage(spr, -spr.width / 2, -spr.height / 2);
  g.restore();

  // frozen tint
  if (e.slowAmt > .05) {
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = .22 + e.slowAmt * .3;
    g.fillStyle = '#6fe6ff';
    g.beginPath(); g.arc(e.x, e.y, e.r * 1.1, 0, TAU); g.fill();
    g.restore();
  }
  if (e.stunT > 0) {
    g.save(); g.globalCompositeOperation = 'lighter';
    g.strokeStyle = '#ffe23c'; g.lineWidth = 2; g.globalAlpha = .8;
    for (let i = 0; i < 3; i++) {
      const ang = G.time * 8 + i / 3 * TAU;
      g.beginPath(); g.arc(e.x + Math.cos(ang) * e.r * 1.3, e.y + Math.sin(ang) * e.r * 1.3, 3, 0, TAU); g.stroke();
    }
    g.restore();
  }

  // charger telegraph
  if (e.ai === 'charge' && e.state === 1) {
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = .35 + Math.sin(G.time * 30) * .2;
    g.strokeStyle = '#ffe23c'; g.lineWidth = 3;
    g.beginPath(); g.moveTo(e.x, e.y);
    g.lineTo(e.x + Math.cos(e.ang) * 300, e.y + Math.sin(e.ang) * 300);
    g.stroke();
    g.restore();
  }

  // hp bar (elites, tanks, bosses handled by HUD)
  if (!e.boss && (e.elite || e.maxHp > 90) && e.hp < e.maxHp) {
    const w = e.r * 2.2, h = 3.4;
    g.fillStyle = 'rgba(0,0,0,.6)';
    g.fillRect(e.x - w / 2, e.y - e.r - 11, w, h);
    g.fillStyle = e.elite ? '#ffc93c' : '#ff4d5e';
    g.fillRect(e.x - w / 2, e.y - e.r - 11, w * (e.hp / e.maxHp), h);
  }
}

/* ===================== BULLET ===================== */
function resetBullet(b, o) {
  b.x = o.x; b.y = o.y;
  b.a = o.a;
  b.spd = o.spd;
  b.vx = Math.cos(o.a) * o.spd; b.vy = Math.sin(o.a) * o.spd;
  b.dmg = o.dmg;
  b.sprite = o.sprite; b.color = o.color;
  b.r = o.r || 8;
  b.life = o.life || 2; b.maxLife = b.life;
  b.pierce = o.pierce || 0;
  b.homing = o.homing || 0;
  b.accel = o.accel || 0; b.maxSpd = o.maxSpd || 0;
  b.scale = o.scale || 1;
  b.spin = o.spin || 0; b.rot = o.a;
  b.aoe = o.aoe || null;
  b.trail = o.trail || null;
  b.knock = o.knock || 0;
  b.boomerang = o.boomerang || false;
  b.noReturn = o.noReturn || false;
  b.range = o.range || 0; b.traveled = 0; b.returning = false;
  b.owner = o.owner || null;
  b.hitCd = o.hitCd || 0;
  b.lob = o.lob || false; b.lobT = 0;
  b.delay = o.delay || 0;
  b.slow = o.slow || 0;
  /* --- cơ chế của vũ khí tiến hoá --- */
  b.split = o.split || 0;            // giết được thì tách thành 2 viên con
  b.trailBoom = o.trailBoom || null; // nổ liên tục dọc đường bay {t, r, dmg, color}
  b.boomT = 0;
  b.grow = o.grow || 0;              // chém trúng thì to & mạnh thêm
  b.growCap = o.growCap || 6;
  b.growN = 0;
  b.hits = Object.create(null);
  b.target = null;
  b.dead = false;
}

function updateBullet(G, b, dt) {
  if (b.delay > 0) { b.delay -= dt; b.x = G.player.x; b.y = G.player.y; return; }
  b.life -= dt;
  if (b.life <= 0) { G.bulletExpire(b); return; }

  if (b.homing) {
    if (!b.target || b.target.dead) b.target = G.nearestEnemy(b.x, b.y, 900);
    if (b.target) {
      const want = angleTo(b.x, b.y, b.target.x, b.target.y);
      let diff = want - b.a;
      while (diff > Math.PI) diff -= TAU;
      while (diff < -Math.PI) diff += TAU;
      b.a += clamp(diff, -b.homing * dt, b.homing * dt);
    }
    if (b.accel) b.spd = Math.min(b.maxSpd || 9999, b.spd + b.accel * dt);
    b.vx = Math.cos(b.a) * b.spd; b.vy = Math.sin(b.a) * b.spd;
    b.rot = b.a;
    if (Math.random() < dt * 22)
      Particles.emit({
        x: b.x, y: b.y, vx: rand(-30, 30), vy: rand(-30, 30),
        life: .3, size: 4, color: b.trail || b.color, drag: .9
      });
  }

  if (b.boomerang) {
    const step = b.spd * dt;
    if (!b.returning) {
      b.traveled += step;
      if (!b.noReturn && b.traveled >= b.range) b.returning = true;
      else if (b.noReturn && b.traveled >= b.range) {
        // orbit-ish: curve back around player forever
        const wa = angleTo(b.x, b.y, b.owner.x, b.owner.y);
        let diff = wa - b.a + Math.PI / 2.2;
        while (diff > Math.PI) diff -= TAU;
        while (diff < -Math.PI) diff += TAU;
        b.a += clamp(diff, -3.2 * dt, 3.2 * dt);
        b.vx = Math.cos(b.a) * b.spd; b.vy = Math.sin(b.a) * b.spd;
      }
    } else {
      const wa = angleTo(b.x, b.y, b.owner.x, b.owner.y);
      let diff = wa - b.a;
      while (diff > Math.PI) diff -= TAU;
      while (diff < -Math.PI) diff += TAU;
      b.a += clamp(diff, -7 * dt, 7 * dt);
      b.vx = Math.cos(b.a) * b.spd; b.vy = Math.sin(b.a) * b.spd;
      if (dist(b.x, b.y, b.owner.x, b.owner.y) < 26) { b.dead = true; return; }
    }
    b.rot += b.spin * dt;
  }

  if (b.lob) b.lobT += dt;

  b.x += b.vx * dt; b.y += b.vy * dt;
  if (!b.homing && !b.boomerang) b.rot += b.spin * dt;

  if (b.trail && Math.random() < dt * 40)
    Particles.trail(b.x, b.y, b.trail, 3, .22);

  // đạn pháo: rải một chuỗi vụ nổ dọc theo đường bay
  if (b.trailBoom) {
    b.boomT -= dt;
    if (b.boomT <= 0) {
      b.boomT = b.trailBoom.t;
      G.miniBoom(b.x, b.y, b.trailBoom.r, b.trailBoom.dmg, b.trailBoom.color);
    }
  }

  const B = G.arena + 90;
  if (b.x < -B || b.x > B || b.y < -B || b.y > B) { G.bulletExpire(b); }
}

function drawBullet(g, G, b) {
  if (b.delay > 0) return;
  const spr = Art.get(b.sprite);
  let yoff = 0, s = (b.r * 2.6) / spr.width;
  if (b.lob) {
    const t = clamp(b.lobT / b.maxLife, 0, 1);
    yoff = -Math.sin(t * Math.PI) * 62;
    // ground shadow
    g.globalAlpha = .35;
    g.drawImage(Art.get('shadow'), b.x - 13, b.y - 6, 26, 13);
    g.globalAlpha = 1;
    s *= 1 + Math.sin(t * Math.PI) * .35;
  }
  g.save();
  g.translate(b.x, b.y + yoff);
  g.rotate(b.rot);
  g.scale(s, s);
  g.drawImage(spr, -spr.width / 2, -spr.height / 2);
  g.restore();
}

/* ===================== ENEMY BULLET ===================== */
function resetEBullet(b, x, y, a, spd, dmg, color) {
  b.x = x; b.y = y; b.vx = Math.cos(a) * spd; b.vy = Math.sin(a) * spd;
  b.dmg = dmg; b.color = color; b.r = 7; b.life = 4.5; b.rot = a;
  b.dead = false;
}
function updateEBullet(G, b, dt) {
  b.life -= dt;
  if (b.life <= 0) { b.dead = true; return; }
  b.x += b.vx * dt; b.y += b.vy * dt;
  const B = G.arena + 60;
  if (b.x < -B || b.x > B || b.y < -B || b.y > B) b.dead = true;
}

/* ===================== PICKUP ===================== */
function resetPickup(o, x, y, type, value) {
  o.x = x; o.y = y; o.type = type; o.value = value;
  o.vx = rand(-90, 90); o.vy = rand(-90, 90);
  o.t = rand(TAU); o.mag = false; o.life = 40; o.dead = false;
  o.sprite = type === 'xp' ? (value >= 12 ? 'p_xp3' : value >= 4 ? 'p_xp2' : 'p_xp1')
    : type === 'coin' ? 'p_coin'
      : type === 'heart' ? 'p_heart'
        : type === 'magnet' ? 'p_magnet'
          : type === 'nuke' ? 'p_nuke' : 'p_chest';
}
function updatePickup(G, o, dt) {
  const p = G.player;
  o.t += dt;
  o.life -= dt;
  if (o.life <= 0 && o.type === 'xp') { o.dead = true; return; }
  const d = dist(o.x, o.y, p.x, p.y);
  if (!o.mag && d < G.stats.pickup) o.mag = true;
  if (o.mag) {
    const a = angleTo(o.x, o.y, p.x, p.y);
    // Phải kẹp: ngọc ở xa (sau khi nhặt Nam Châm) cho lực ÂM -> bị đẩy ra xa
    // -> càng xa lực càng âm -> tăng tốc vô hạn -> toạ độ thành NaN.
    const pull = clamp(340 + (G.stats.pickup - d) * 4.5, 260, 1500);
    o.vx = lerp(o.vx, Math.cos(a) * pull, 1 - Math.pow(.002, dt));
    o.vy = lerp(o.vy, Math.sin(a) * pull, 1 - Math.pow(.002, dt));
  } else {
    o.vx *= Math.pow(.02, dt); o.vy *= Math.pow(.02, dt);
  }
  o.x += o.vx * dt; o.y += o.vy * dt;
  if (d < p.r + 12) { G.collect(o); o.dead = true; }
}
function drawPickup(g, G, o) {
  const spr = Art.get(o.sprite);
  const bob = Math.sin(o.t * 4) * 2.2;
  const sc = (o.type === 'chest' ? 40 : o.type === 'xp' ? 17 : 22) / spr.width * 1.5;
  g.save();
  g.translate(o.x, o.y + bob);
  if (o.type === 'xp') g.rotate(o.t * 1.6);
  g.scale(sc, sc);
  g.drawImage(spr, -spr.width / 2, -spr.height / 2);
  g.restore();
}
