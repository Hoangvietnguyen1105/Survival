/* ============ NEON HORDE — core game ============ */
'use strict';

const G = {
  canvas: null, ctx: null,
  W: 0, H: 0, dpr: 1,
  arena: 1500,
  ARENA_FULL: 1500,
  state: 'menu',            // menu | playing | levelup | pause | dead
  time: 0, runTime: 0,
  paused: false,

  player: null,
  stats: baseStats(),
  weapons: [],              // [{id, lv, t, evolved}]
  passives: [],             // [{id, lv}]
  sigils: [],               // [{id, lv, n, t, used}] — buff 4 tầng
  rage: false,              // Ấn Phượng Hoàng tầng 3: máu thấp thì mạnh lên

  wave: 1, waveTime: 0, waveDur: 30,
  spawnT: 0, bossActive: null, waveState: 'fight',
  /* LUẬT ĐẤU TRƯỜNG — id luật của trùm đang đánh, null nếu không có trùm.
     ARENA_FULL là kích thước gốc để luật THU HẸP còn biết đường trả lại. */
  bossRule: null, eclipseT: 0,
  kills: 0, gold: 0, dmgDealt: 0,

  /* ====== TRẦN HỒI MÁU — chỗ chữa bệnh "cuối game không thể thua" ======
     Ba nguồn hồi máu đều tăng theo SÁT THƯƠNG GÂY RA hoặc SỐ MẠNG HẠ ĐƯỢC, mà hai thứ đó
     cuối game lớn không giới hạn, còn máu tối đa thì cố định — nên người chơi thành bất tử:
       · hút máu (HUYẾT ẤN, ẤN HUYẾT NGUYỆT tầng 1)
       · ẤN HUYẾT NGUYỆT tầng 3: hồi 2 máu mỗi mạng  (~100 mạng/giây = 200 máu/giây!)
       · tim rơi ra từ quái: 2,2% quái thường + 35% quái tinh anh  (~180 máu/giây ở màn 35)
     Đo được trước khi có trần: màn 35, bot ăn 5085 sát thương trong 120 giây mà VẪN ĐẦY MÁU.
     Nay cả ba rút chung một hũ, hũ đầy lại mỗi giây đúng
        máu tối đa × (HEAL_BASE + hút máu × HEAL_LS).
     HỒI MÁU MỖI GIÂY của BÙA HỒI SINH cố ý ĐỨNG NGOÀI trần — nó là con số cố định người
     chơi đã trả giá để có, không phình theo sát thương. */
  HEAL_BASE: .045,
  HEAL_LS: 1.1,
  healPool: 0,

  /* Móc nối cho BẢNG DEBUG (debug.js). Mặc định tắt — khi tắt thì game chạy y hệt
     như không có bảng debug. `dbgLockWave` > 0 = đang ở MAP TEST: khoá màn lại,
     không hết giờ nên không sang màn và không tự gọi trùm. */
  dbgLockWave: 0,
  dbgGod: false,

  /* Trần nhịp rơi cho hai vật phẩm "xoá sạch màn hình". Tỉ lệ rơi tính THEO MẠNG, mà
     cuối game hạ tới ~130 mạng/giây → nam châm và bom hạt nhân rơi liên tục và ván đấu
     thành đi bộ (đo ở màn 30: 0,5 quả bom hạt nhân MỖI GIÂY).
     Đầu game chỉ ~2 mạng/giây nên hai con số dưới đây không bao giờ chạm tới → độ khó
     những màn đầu giữ nguyên y hệt. Cùng loại bệnh với trần hồi máu (bẫy số 10). */
  DROP_CD: { magnet: 14, nuke: 45 },
  dropCd: { magnet: 0, nuke: 0 },
  pendingLevels: 0,
  slowmo: 1, slowmoT: 0,

  beams: [], arcs: [], novas: [], timers: [], zones: [],
  grid: new Grid(110),
  _q: [],
  dmgBudget: 0,

  /* -------- pools -------- */
  enemies: new Pool(() => ({}), resetEnemy),
  bullets: new Pool(() => ({}), resetBullet),
  ebullets: new Pool(() => ({}), resetEBullet),
  pickups: new Pool(() => ({}), resetPickup),

  /* ===================== setup ===================== */
  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.resize();
    addEventListener('resize', () => this.resize());
    addEventListener('orientationchange', () => setTimeout(() => this.resize(), 300));
  },

  resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    this.dpr = dpr;
    const w = innerWidth, h = innerHeight;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.W = w; this.H = h;
    Cam.W = w; Cam.H = h;
    // zoom out a bit on small screens so you can see more
    Cam.tzoom = clamp(Math.min(w, h) / 620, .62, 1.15);
    if (this.state === 'menu') Cam.zoom = Cam.tzoom;
  },

  /* ===================== run lifecycle ===================== */
  start(charId) {
    this.player = createPlayer(charId);
    this.weapons = [{ id: this.player.ch.weapon, lv: 1, t: 0, evolved: false }];
    this.passives = [];
    this.sigils = [];
    this.rage = false;
    Sigils.reset();
    this.wave = 1; this.waveDur = 30; this.waveTime = this.waveDur;
    this.waveState = 'fight';
    this.kills = 0; this.gold = 0; this.dmgDealt = 0;
    this.healPool = 0;
    this.dropCd.magnet = 0; this.dropCd.nuke = 0;
    this.dbgLockWave = 0;      // ván mới luôn thoát MAP TEST
    this.time = 0; this.runTime = 0;
    this.pendingLevels = 0;
    this.bossActive = null;
    this.clearBossRule();
    this.spawnT = 0;
    this.slowmo = 1; this.slowmoT = 0;
    this.beams.length = 0; this.arcs.length = 0; this.novas.length = 0; this.zones.length = 0;
    this.timers.length = 0;

    this.enemies.clear(); this.bullets.clear();
    this.ebullets.clear(); this.pickups.clear();
    Particles.clear(); FloatText.clear();

    this.recalc(true);
    this.player.hp = this.player.maxHp;
    Cam.x = Cam.y = 0; Cam.shake = 0; Cam.zoom = Cam.tzoom;

    this.state = 'playing';
    this.paused = false;
    Sfx.startMusic();
    Sfx.setIntensity(.15);
    UI.announce('MÀN 1', '#25f4ee');
    Sfx.waveStart();
  },

  /** recompute derived stats from char + passives */
  recalc(full) {
    const s = baseStats();
    const mods = this.player.ch.mods;
    for (const k in mods) {
      if (k === 'maxHp' || k === 'armor' || k === 'pickup' || k === 'proj' || k === 'regen') s[k] += mods[k];
      else s[k] += mods[k];
    }
    for (const p of this.passives) PASSIVES[p.id].apply(s, p.lv);
    for (const q of this.sigils) SIGILS[q.id].apply(s, q.lv);
    const oldMax = this.player.maxHp;
    this.stats = s;
    this.player.maxHp = s.maxHp;
    if (full) this.player.hp = s.maxHp;
    else if (s.maxHp > oldMax) this.player.hp += (s.maxHp - oldMax);
    this.player.hp = Math.min(this.player.hp, this.player.maxHp);
  },

  /* ===================== main update ===================== */
  update(dt) {
    if (this.state !== 'playing') return;

    // slow-motion
    if (this.slowmoT > 0) {
      this.slowmoT -= dt;
      this.slowmo = lerp(this.slowmo, .28, 1 - Math.pow(.001, dt));
    } else this.slowmo = lerp(this.slowmo, 1, 1 - Math.pow(.02, dt));
    const sdt = dt * this.slowmo;

    this.time += sdt;
    this.runTime += sdt;
    this.dmgBudget = 9;

    if (this.dropCd.magnet > 0) this.dropCd.magnet -= sdt;
    if (this.dropCd.nuke > 0) this.dropCd.nuke -= sdt;

    /* ---- hũ hồi máu, đầy lại theo thời gian (xem HEAL_BASE / HEAL_LS) ---- */
    const healCap = this.player.maxHp * (G.HEAL_BASE + this.stats.lifesteal * G.HEAL_LS);
    // Hũ chứa được cả một cục (30% máu tối đa) chứ không chỉ 1 giây hồi: nếu không thì
    // đầu game hũ chỉ giữ ~4 máu, một trái tim 14 máu ăn vào chỉ được 4 -> tim thành vô dụng.
    // Ở màn cao thì 30% máu tối đa là hạt cát, hũ cạn ngay và chỉ còn nhỏ giọt theo healCap.
    this.healPool = Math.min(this.healPool + healCap * sdt, Math.max(healCap * 1.2, this.player.maxHp * .30));

    const p = this.player;
    updatePlayer(this, sdt);

    /* ---- rebuild spatial grid ---- */
    this.grid.clear();
    const ea = this.enemies.active;
    for (let i = 0; i < ea.length; i++) this.grid.insert(ea[i]);

    /* ---- weapons ---- */
    this.updateWeapons(sdt);

    /* ---- enemies ---- */
    for (let i = 0; i < ea.length; i++) updateEnemy(this, ea[i], sdt);
    this.separate(sdt);

    /* ---- contact damage ---- */
    const near = this.grid.query(p.x, p.y, 90, this._q);
    for (let i = 0; i < near.length; i++) {
      const e = near[i];
      if (e.dead || e.spawnT > 0) continue;
      const rr = e.r + p.r;
      if (dist2(e.x, e.y, p.x, p.y) < rr * rr) {
        if (e.hitCd <= 0) { this.hurtPlayer(e.dmg, e); e.hitCd = .6; }
        // push apart
        const a = angleTo(p.x, p.y, e.x, e.y);
        const push = e.boss ? 0 : 220;
        e.vx += Math.cos(a) * push * sdt * 8;
        e.vy += Math.sin(a) * push * sdt * 8;
      }
    }

    /* ---- bullets ---- */
    const ba = this.bullets.active;
    for (let i = 0; i < ba.length; i++) {
      const b = ba[i];
      updateBullet(this, b, sdt);
      if (b.dead || b.delay > 0) continue;
      this.bulletHits(b);
    }
    this.bullets.sweep();

    /* ---- enemy bullets ---- */
    const eb = this.ebullets.active;
    for (let i = 0; i < eb.length; i++) {
      const b = eb[i];
      updateEBullet(this, b, sdt);
      if (b.dead) continue;
      const rr = b.r + p.r;
      if (dist2(b.x, b.y, p.x, p.y) < rr * rr) {
        this.hurtPlayer(b.dmg, null);
        b.dead = true;
        Particles.burst(b.x, b.y, 8, b.color, { speed: 140, life: .3, size: 4 });
      }
    }
    this.ebullets.sweep();

    /* ---- pickups ---- */
    const pa = this.pickups.active;
    for (let i = 0; i < pa.length; i++) updatePickup(this, pa[i], sdt);
    this.pickups.sweep();

    this.enemies.sweep();

    /* ---- fx lists ---- */
    for (let i = this.beams.length - 1; i >= 0; i--) {
      this.beams[i].life -= sdt;
      if (this.beams[i].life <= 0) this.beams.splice(i, 1);
    }
    for (let i = this.arcs.length - 1; i >= 0; i--) {
      this.arcs[i].life -= sdt;
      if (this.arcs[i].life <= 0) this.arcs.splice(i, 1);
    }
    for (let i = this.novas.length - 1; i >= 0; i--) {
      const n = this.novas[i];
      n.life -= sdt;
      if (n.life <= 0) this.novas.splice(i, 1);
    }

    /* ---- vùng hiệu ứng (vũng điện, hố phóng xạ, bão tuyết...) ---- */
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i];
      z.life -= sdt;
      if (z.life <= 0) { this.zones.splice(i, 1); continue; }
      if (z.follow) { z.x = p.x; z.y = p.y; }
      z.dmgT -= sdt;
      if (z.dmgT <= 0) {
        z.dmgT = .25;
        for (const e of this.enemiesInRadius(z.x, z.y, z.r)) {
          this.damageEnemy(e, z.dps * .25, { silent: true, sigil: true });
          if (z.slow) { e.slowAmt = Math.max(e.slowAmt, z.slow); e.slowT = Math.max(e.slowT, .8); }
        }
      }
      if (Math.random() < sdt * (z.fx || 12)) {
        const a = rand(TAU), rr = Math.sqrt(Math.random()) * z.r;
        Particles.emit({
          x: z.x + Math.cos(a) * rr, y: z.y + Math.sin(a) * rr,
          vx: rand(-18, 18), vy: rand(-52, -14),
          life: .5, size: 5, color: z.color, drag: .93
        });
      }
    }

    Particles.update(sdt);
    FloatText.update(sdt);

    /* ---- ấn ký ---- */
    Sigils.update(this, sdt);

    /* ---- timers & wave ---- */
    this.tickTimers(sdt);
    this.updateWave(sdt);

    Cam.follow(p.x + p.vx * .12, p.y + p.vy * .12, dt);
    Cam.update(dt);

    /* ---- level ups ---- */
    if (this.pendingLevels > 0 && this.state === 'playing') {
      this.pendingLevels--;
      UI.showLevelUp();
    }
  },

  /** schedule fn after `sec` of GAME time (respects pause & slow-mo) */
  after(sec, fn) { this.timers.push({ t: sec, fn }); },

  tickTimers(dt) {
    for (let i = this.timers.length - 1; i >= 0; i--) {
      const t = this.timers[i];
      t.t -= dt;
      if (t.t <= 0) { this.timers.splice(i, 1); t.fn(); }
    }
  },

  /* ---- keep enemies from stacking ---- */
  separate(dt) {
    const a = this.enemies.active;
    const q = [];
    for (let i = 0; i < a.length; i++) {
      const e = a[i];
      if (e.boss) continue;
      this.grid.query(e.x, e.y, e.r * 2.1, q);
      let n = 0;
      for (let j = 0; j < q.length && n < 5; j++) {
        const o = q[j];
        if (o === e || o.dead) continue;
        const dx = e.x - o.x, dy = e.y - o.y;
        const rr = e.r + o.r;
        const d2 = dx * dx + dy * dy;
        if (d2 > 0.001 && d2 < rr * rr) {
          const d = Math.sqrt(d2);
          const f = (rr - d) / rr * 240;
          e.vx += dx / d * f * dt * 8;
          e.vy += dy / d * f * dt * 8;
          n++;
        }
      }
    }
  },

  /* ===================== weapons ===================== */
  updateWeapons(dt) {
    const p = this.player;
    for (const w of this.weapons) {
      const def = WEAPONS[w.id];
      if (w.id === 'blade') {
        const s = def.stat(w.lv);
        p.bladeAng += s.rot * (w.evolved ? 1.08 : 1) * dt;
        const rings = bladeRings(this, p);
        for (const ring of rings.list) {
          for (let i = 0; i < ring.n; i++) {
            const a = ring.ang + i / ring.n * TAU;
            const bx = p.x + Math.cos(a) * ring.rad, by = p.y + Math.sin(a) * ring.rad;
            const hits = this.grid.query(bx, by, ring.hitR + 34, this._q);
            for (const e of hits) {
              if (e.dead || e.spawnT > 0 || e.bladeCd > 0) continue;
              const rr = ring.hitR + e.r;
              if (dist2(bx, by, e.x, e.y) < rr * rr) {
                e.bladeCd = .42;
                this.damageEnemy(e, s.dmg * (w.evolved ? .82 : 1) * this.stats.damage, { knock: 210, ang: a });
                Particles.burst(bx, by, 5, '#8ff6ff', { speed: 180, life: .25, size: 4 });
                Sfx.shoot('blade');
                // THIÊN LUÂN: mỗi nhát chém bắn ra một sóng xung kích nhỏ
                if (w.evolved) {
                  Particles.ring(bx, by, 34 * this.stats.area, '#8ff6ff', .2, 2);
                  for (const o of this.enemiesInRadius(bx, by, 34 * this.stats.area))
                    if (o !== e) this.damageEnemy(o, s.dmg * .10 * this.stats.damage, { silent: true, sigil: true });
                }
              }
            }
          }
        }
        continue;
      }
      if (def.passive) continue;

      w.t -= dt * this.stats.haste;
      if (w.t <= 0) {
        const s = def.stat(w.lv);
        const ok = def.fire(this, p, w);
        // evoCd: bản tiến hoá có thể bắn nhanh hơn (<1) hoặc chậm hơn (>1) bản thường
        const mul = (w.evolved && def.evoCd) ? def.evoCd : 1;
        w.t = Math.max(.08, (s.cd !== undefined ? s.cd : .5) * mul);
        if (!ok) w.t = .15;      // retry soon if no target
      }
    }
    // blade cooldown ticks
    for (const e of this.enemies.active) if (e.bladeCd > 0) e.bladeCd -= dt;
  },

  /* ===================== weapon API ===================== */
  spawnBullet(o) { if (this.bullets.count < 600) this.bullets.spawn(o); },
  spawnEBullet(x, y, a, spd, dmg, color) {
    if (this.ebullets.count < 400) this.ebullets.spawn(x, y, a, spd, dmg, color);
  },

  nearestEnemy(x, y, maxD) {
    const list = this.grid.query(x, y, maxD, this._q);
    let best = null, bd = maxD * maxD;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e.dead || e.spawnT > 0) continue;
      const d = dist2(x, y, e.x, e.y);
      if (d < bd) { bd = d; best = e; }
    }
    if (!best && maxD < 1400) {           // fallback: brute force
      const a = this.enemies.active;
      let bd2 = 1e12;
      for (let i = 0; i < a.length; i++) {
        const e = a[i];
        if (e.dead || e.spawnT > 0) continue;
        const d = dist2(x, y, e.x, e.y);
        if (d < bd2) { bd2 = d; best = e; }
      }
    }
    return best;
  },

  randomEnemyNear(x, y, maxD) {
    const list = this.grid.query(x, y, maxD, this._q).filter(e => !e.dead && e.spawnT <= 0);
    if (!list.length) return this.nearestEnemy(x, y, 1200);
    return list[(Math.random() * list.length) | 0];
  },

  enemiesInRadius(x, y, r) {
    const list = this.grid.query(x, y, r, []);
    const out = [];
    for (const e of list) {
      if (e.dead || e.spawnT > 0) continue;
      const rr = r + e.r;
      if (dist2(x, y, e.x, e.y) < rr * rr) out.push(e);
    }
    return out;
  },

  muzzle(x, y, a, color, scale = 1) {
    const mx = x + Math.cos(a) * 18, my = y + Math.sin(a) * 18;
    Particles.burst(mx, my, Math.round(4 * scale) + 3, color,
      { speed: 220, life: .2, size: 4 * scale, angle: a, spread: .5 });
  },

  fireLaser(x, y, a, len, w, dmg) {
    const dx = Math.cos(a), dy = Math.sin(a);
    this.beams.push({ x, y, a, len, w, life: .26, maxLife: .26 });
    const list = this.enemies.active;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e.dead || e.spawnT > 0) continue;
      const px = e.x - x, py = e.y - y;
      const t = px * dx + py * dy;
      if (t < -e.r || t > len) continue;
      const cx = x + dx * t, cy = y + dy * t;
      const rr = w * .5 + e.r;
      if (dist2(cx, cy, e.x, e.y) < rr * rr) {
        this.damageEnemy(e, dmg, { knock: 90, ang: a });
        Particles.burst(e.x, e.y, 5, '#ff88bb', { speed: 190, life: .3, size: 4 });
      }
    }
    Cam.doFlash('#ff2e88', .18);
  },

  chainLightning(sx, sy, first, chain, dmg, evolved) {
    let cur = first, px = sx, py = sy;
    const seen = new Set();
    for (let i = 0; i < chain && cur; i++) {
      seen.add(cur.uid);
      this.arcs.push({ x1: px, y1: py, x2: cur.x, y2: cur.y, life: .28, maxLife: .28, seed: Math.random() * 1000 });
      this.damageEnemy(cur, dmg * Math.pow(.88, i), { knock: 40 });
      if (evolved) { cur.stunT = Math.max(cur.stunT, .8); }
      Particles.burst(cur.x, cur.y, 7, '#c9a8ff', { speed: 210, life: .3, size: 4 });
      px = cur.x; py = cur.y;
      // next target
      const list = this.grid.query(px, py, 240, this._q);
      let best = null, bd = 240 * 240;
      for (const e of list) {
        if (e.dead || seen.has(e.uid) || e.spawnT > 0) continue;
        const d = dist2(px, py, e.x, e.y);
        if (d < bd) { bd = d; best = e; }
      }
      cur = best;
    }
    Cam.doFlash('#9d6bff', .22);
  },

  frostNova(x, y, r, dmg, slow, dur, evolved) {
    this.novas.push({ x, y, r, life: .45, maxLife: .45, color: evolved ? '#aef3ff' : '#6fe6ff' });
    Particles.shockwave(x, y, r, '#6fe6ff');
    for (const e of this.enemiesInRadius(x, y, r)) {
      this.damageEnemy(e, dmg, { knock: 60 });
      e.slowAmt = Math.max(e.slowAmt, slow);
      e.slowT = Math.max(e.slowT, dur);
      if (evolved) e.stunT = Math.max(e.stunT, 1.5);
    }
    for (let i = 0; i < 14; i++) {
      const a = rand(TAU);
      this.spawnBulletFrostShard(x, y, a, r);
    }
  },
  spawnBulletFrostShard(x, y, a, r) {
    Particles.emit({
      x: x + Math.cos(a) * 12, y: y + Math.sin(a) * 12,
      vx: Math.cos(a) * r * 2.4, vy: Math.sin(a) * r * 2.4,
      life: .38, size: 5, color: '#aef3ff', drag: .86
    });
  },

  auraPulse(x, y, r, evolved) {
    if (Math.random() < .5) {
      const a = rand(TAU);
      Particles.emit({
        x: x + Math.cos(a) * r, y: y + Math.sin(a) * r,
        vx: -Math.cos(a) * 60, vy: -Math.sin(a) * 60,
        life: .45, size: 5, color: evolved ? '#c14dff' : '#b6ff3a', drag: .93
      });
    }
  },

  /** Vùng gây sát thương theo thời gian. o = {x,y,r,life,dps,color,slow,follow,fx} */
  addZone(o) {
    if (this.zones.length > 60) this.zones.shift();
    o.maxLife = o.life; o.dmgT = 0;
    this.zones.push(o);
    return o;
  },

  /** LÔI VŨ — gọi n tia sét từ trời, mỗi chỗ để lại vũng điện. */
  thunderRain(n, dmg, zoneDps) {
    const p = this.player, A = this.stats.area;
    for (let i = 0; i < n; i++) {
      this.after(i * .10, () => {
        const tgt = this.randomEnemyNear(p.x, p.y, 640);
        const x = tgt ? tgt.x + rand(-40, 40) : p.x + rand(-420, 420);
        const y = tgt ? tgt.y + rand(-40, 40) : p.y + rand(-420, 420);
        this.arcs.push({
          x1: x + rand(-40, 40), y1: y - 900, x2: x, y2: y,
          life: .3, maxLife: .3, seed: rand(1000), color: '#ffe23c'
        });
        Particles.ring(x, y, 70 * A, '#ffe23c', .28, 2);
        for (const e of this.enemiesInRadius(x, y, 70 * A))
          this.damageEnemy(e, dmg, { knock: 100, ang: angleTo(x, y, e.x, e.y) });
        // fx thấp: mỗi vũng chỉ nhả ít hạt, nếu không 20 vũng sẽ ngốn hết kho hạt
        this.addZone({ x, y, r: 62 * A, life: 2, dps: zoneDps, color: '#ffe23c', fx: 4 });
      });
    }
    // rung MỘT lần cho cả loạt, không rung theo từng tia (rất giật)
    Cam.addShake(2);
    Cam.doFlash('#ffe23c', .15);
  },

  /** LĂNG KÍNH — tia laser nảy giữa các kẻ địch, mỗi lần nảy đổi màu cầu vồng. */
  prismBeam(first, bounces, dmg, w) {
    const cols = ['#ff2e88', '#ff8a3c', '#ffe23c', '#b6ff3a', '#25f4ee', '#9d6bff', '#ff5ecf'];
    let px = this.player.x, py = this.player.y, cur = first;
    const seen = new Set();

    for (let i = 0; i <= bounces && cur; i++) {
      seen.add(cur.uid);
      const a = angleTo(px, py, cur.x, cur.y);
      const len = dist(px, py, cur.x, cur.y) + 60;
      const col = cols[i % cols.length];
      this.beams.push({ x: px, y: py, a, len, w, life: .3, maxLife: .3, color: col });

      // quét sát thương dọc theo đoạn tia
      const dx = Math.cos(a), dy = Math.sin(a);
      for (const e of this.enemies.active) {
        if (e.dead || e.spawnT > 0) continue;
        const rx = e.x - px, ry = e.y - py;
        const t = rx * dx + ry * dy;
        if (t < -e.r || t > len) continue;
        const cx = px + dx * t, cy = py + dy * t;
        const rr = w * .5 + e.r;
        if (dist2(cx, cy, e.x, e.y) < rr * rr) {
          this.damageEnemy(e, dmg, { knock: 70, ang: a });
          Particles.burst(e.x, e.y, 5, col, { speed: 200, life: .3, size: 4 });
        }
      }

      px = cur.x; py = cur.y;
      let best = null, bd = 460 * 460;
      for (const e of this.enemiesInRadius(px, py, 460)) {
        if (seen.has(e.uid)) continue;
        const d = dist2(px, py, e.x, e.y);
        if (d < bd) { bd = d; best = e; }
      }
      cur = best;
    }
    Cam.doFlash('#ffffff', .12);
    Cam.addShake(1.2);
  },

  explode(x, y, r, dmg, color, big, cluster, crater) {
    Particles.shockwave(x, y, r, color);
    Particles.burst(x, y, big ? 18 : 8, color, { speed: big ? 420 : 280, life: .55, size: big ? 8 : 5 });
    Particles.smoke(x, y, '#2a2f45', big ? 4 : 2);
    Sfx.explode(!!big);
    Cam.addShake(big ? 7 : 3.5);
    Cam.doFlash(color, big ? .3 : .18);
    for (const e of this.enemiesInRadius(x, y, r)) {
      const falloff = 1 - clamp(dist(x, y, e.x, e.y) / r, 0, 1) * .45;
      this.damageEnemy(e, dmg * falloff, { knock: 300, ang: angleTo(x, y, e.x, e.y) });
    }
    if (crater) {
      this.addZone({ x, y, r: r * .8, life: crater.life, dps: crater.dps, color, fx: 26 });
    }
    if (cluster) {
      for (let i = 0; i < cluster; i++) {
        const a = rand(TAU), d = rand(50, r * .9);
        const cx = x + Math.cos(a) * d, cy = y + Math.sin(a) * d;
        this.after(.12 + i * .09, () => this.explode(cx, cy, r * .5, dmg * .45, color, false, 0));
      }
    }
  },

  /**
   * Vụ nổ nhỏ KHÔNG rung màn hình — dùng cho chuỗi nổ dọc đường của Pháo Hạm.
   * Nếu dùng explode() thường, hàng chục vụ nổ liên tiếp sẽ rung màn hình không dứt.
   */
  miniBoom(x, y, r, dmg, color) {
    Particles.ring(x, y, r, color, .28, 3);
    Particles.burst(x, y, 6, color, { speed: 240, life: .4, size: 5 });
    for (const e of this.enemiesInRadius(x, y, r)) {
      const falloff = 1 - clamp(dist(x, y, e.x, e.y) / r, 0, 1) * .45;
      this.damageEnemy(e, dmg * falloff, { knock: 160, ang: angleTo(x, y, e.x, e.y) });
    }
  },

  bulletExpire(b) {
    b.dead = true;
    if (b.aoe) this.explode(b.x, b.y, b.aoe.r, b.aoe.dmg, b.aoe.color, b.aoe.big, b.aoe.cluster, b.aoe.crater);
  },

  bulletHits(b) {
    const list = this.grid.query(b.x, b.y, b.r + 40, this._q);
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (e.dead || e.spawnT > 0) continue;
      const prev = b.hits[e.uid];
      if (prev !== undefined && (!b.hitCd || this.time - prev < b.hitCd)) continue;
      const rr = b.r + e.r;
      if (dist2(b.x, b.y, e.x, e.y) < rr * rr) {
        b.hits[e.uid] = this.time;
        const wasAlive = !e.dead;
        this.damageEnemy(e, b.dmg, { knock: b.knock, ang: b.a });

        // ĐẠN PHÂN LIỆT: viên nào hạ gục thì tách thành 2 viên con tự truy đuổi
        if (b.split > 0 && wasAlive && e.dead) {
          for (let k = 0; k < 2; k++) {
            this.spawnBullet({
              x: e.x, y: e.y, a: rand(TAU), spd: 380, dmg: b.dmg * .55,
              sprite: 'b_basic', color: '#8ff6ff', r: b.r * .9, life: 1.6,
              homing: 6, accel: 520, maxSpd: 720, scale: b.scale,
              split: b.split - 1, knock: 40, pierce: 1
            });
          }
          Particles.burst(e.x, e.y, 4, '#8ff6ff', { speed: 220, life: .26, size: 3.5 });
        }

        // LƯỠI HÁI: chém trúng thì to và mạnh thêm
        if (b.grow > 0 && b.growN < b.growCap) {
          b.growN++;
          b.r *= 1 + b.grow;
          b.dmg *= 1 + b.grow;
          b.spd *= 1.04;
          Particles.ring(b.x, b.y, b.r * 1.6, b.color, .2, 2);
        }
        if (b.slow) { e.slowAmt = Math.max(e.slowAmt, b.slow); e.slowT = Math.max(e.slowT, 1.5); }
        // 3 hạt/lần trúng, không phải 5 — vũ khí bắn nhanh chạm trần 900 hạt
        // trong vài giây, màn hình trắng xoá không nhìn thấy quái đâu nữa
        Particles.burst(b.x, b.y, 3, b.color, { speed: 190, life: .22, size: 3.5, angle: b.a + Math.PI, spread: 1.1 });
        if (b.aoe) { this.explode(b.x, b.y, b.aoe.r, b.aoe.dmg, b.aoe.color, b.aoe.big, b.aoe.cluster, b.aoe.crater); b.dead = true; return; }
        if (b.pierce > 0) { b.pierce--; }
        else if (!b.boomerang) { b.dead = true; return; }
      }
    }
  },

  /* ===================== damage ===================== */
  damageEnemy(e, dmg, opt = {}) {
    if (e.dead) return;
    dmg *= Sigils.dmgMul(this, e);          // cộng dồn từ các Ấn Ký + cơn thịnh nộ
    let crit = false;
    if (Math.random() < this.stats.crit) { crit = true; dmg *= this.stats.critDmg; }
    dmg = Math.max(1, dmg);
    // chỉ tính phần sát thương THỰC SỰ ăn vào, không tính phần thừa —
    // nếu không đòn hành quyết (99999) sẽ thổi phồng thống kê cuối ván
    this.dmgDealt += Math.min(dmg, Math.max(0, e.hp));
    e.hp -= dmg;
    e.flash = .22;

    // KHÁT MÁU (luật của HUYẾT NHÃN): vô hiệu hoá hút máu suốt trận trùm
    if (this.stats.lifesteal > 0 && this.bossRule !== 'bloodthirst') {
      const p = this.player;
      // Hút máu phải đi qua hũ có trần (G.HEAL_BASE / G.HEAL_LS), nếu không thì cuối game bất tử.
      const heal = Math.min(dmg * this.stats.lifesteal, this.healPool);
      if (heal > 0 && p.hp < p.maxHp) {
        this.healPool -= heal;
        p.hp = Math.min(p.maxHp, p.hp + heal);
        if (Math.random() < .12) Particles.emit({ x: p.x, y: p.y - 10, vx: rand(-20, 20), vy: -50, life: .5, size: 4, color: '#ff2e88' });
      }
    }

    if (opt.knock && !e.boss) {
      const kn = opt.knock * (1 - (e.knockRes || 0));
      const a = opt.ang !== undefined ? opt.ang : angleTo(this.player.x, this.player.y, e.x, e.y);
      e.vx += Math.cos(a) * kn;
      e.vy += Math.sin(a) * kn;
    }

    if (!opt.silent && this.dmgBudget > 0) {
      this.dmgBudget--;
      FloatText.add(e.x + rand(-8, 8), e.y - e.r - 4, crit ? '✦' + Math.round(dmg) : String(Math.round(dmg)),
        crit ? '#ffe23c' : '#ffffff', crit ? 21 : 15);
    }
    if (!opt.silent) Sfx.hit(crit);
    if (crit) {
      Particles.burst(e.x, e.y, 8, '#ffe23c', { speed: 260, life: .35, size: 5 });
      Cam.addShake(1.6);
    }

    // opt.sigil = sát thương do chính Ấn Ký gây ra -> không kích hoạt lại, tránh đệ quy vô hạn
    if (!opt.sigil) Sigils.onHit(this, e);
    if (e.hp <= 0) { this.killEnemy(e); return; }
    if (!opt.sigil) Sigils.afterHit(this, e);
  },

  killEnemy(e) {
    if (e.dead) return;
    e.dead = true;
    this.kills++;
    Sigils.onKill(this, e);

    Particles.burst(e.x, e.y, e.boss ? 60 : 12, e.color, { speed: e.boss ? 520 : 260, life: .6, size: e.boss ? 9 : 5 });
    Particles.ring(e.x, e.y, e.r * (e.boss ? 6 : 2.4), e.color, .4, e.boss ? 8 : 3);

    if (e.boss) {
      Sfx.bossDie();
      Cam.addShake(24);
      Cam.doFlash('#fff', .8);
      this.slowmoT = 1.4;
      this.bossActive = null;
      this.clearBossRule();          // gỡ luật ngay, đừng để dính sang màn sau
      UI.hideBossBar();
      UI.announce('HẠ GỤC!', '#ffc93c');
      // treasure
      for (let i = 0; i < 3; i++) {
        const a = rand(TAU);
        this.pickups.spawn(e.x + Math.cos(a) * 40, e.y + Math.sin(a) * 40, 'chest', 1);
      }
      for (let i = 0; i < 26; i++) {
        const a = rand(TAU), d = rand(20, 130);
        this.pickups.spawn(e.x + Math.cos(a) * d, e.y + Math.sin(a) * d, 'xp', Math.ceil(e.xp / 12));
      }
      for (let i = 0; i < 8; i++) {
        const a = rand(TAU), d = rand(20, 110);
        this.pickups.spawn(e.x + Math.cos(a) * d, e.y + Math.sin(a) * d, 'coin', 10);
      }
      this.waveState = 'clear';
      this.after(1.5, () => this.endWave());
      return;
    }

    Sfx.kill();

    if (e.def.deathBomb) {
      this.explode(e.x, e.y, 82, e.def.deathBomb * (1 + this.wave * .1), '#ff5ecf', false, 0);
    }
    if (e.split && e.type !== '_split') {
      for (let i = 0; i < e.split; i++) {
        const a = rand(TAU);
        const c = this.spawnEnemy('swarm', e.x + Math.cos(a) * 22, e.y + Math.sin(a) * 22);
        if (c) c.type = '_split';
      }
    }

    /* TÁCH BẦY (luật của TRÙNG MẪU): quái thường chết đều đẻ ra 2 con swarm.
       Con đẻ ra được đánh dấu '_split' nên KHÔNG đẻ tiếp — nếu không thì
       một cú nổ diện rộng sẽ thành phản ứng dây chuyền hàm mũ, treo máy. */
    if (this.bossRule === 'hive' && !e.boss && e.type !== '_split' && this.enemies.count < 240) {
      for (let i = 0; i < 2; i++) {
        const a = rand(TAU);
        const c = this.spawnEnemy('swarm', e.x + Math.cos(a) * 20, e.y + Math.sin(a) * 20);
        if (c) c.type = '_split';
      }
      Particles.burst(e.x, e.y, 6, '#ff2e88', { speed: 180, life: .3, size: 4 });
    }

    // drops
    const xpv = Math.max(1, Math.round(e.xp * (e.elite ? 4 : 1)));
    this.pickups.spawn(e.x, e.y, 'xp', xpv);
    const luck = Math.random();
    if (e.elite) {
      this.pickups.spawn(e.x + rand(-14, 14), e.y + rand(-14, 14), 'coin', 8);
      if (luck < .35) this.pickups.spawn(e.x, e.y + 12, 'heart', 22);
    } else {
      if (luck < .022) this.pickups.spawn(e.x, e.y, 'heart', 14);
      else if (luck < .055) this.pickups.spawn(e.x, e.y, 'coin', 3);
      // hai cái này phải qua trần nhịp, xem DROP_CD
      else if (luck < .062) {
        if (this.dropCd.magnet <= 0) { this.dropCd.magnet = this.DROP_CD.magnet; this.pickups.spawn(e.x, e.y, 'magnet', 1); }
      } else if (luck < .066) {
        if (this.dropCd.nuke <= 0) { this.dropCd.nuke = this.DROP_CD.nuke; this.pickups.spawn(e.x, e.y, 'nuke', 1); }
      }
    }
  },

  hurtPlayer(dmg, src) {
    const p = this.player;
    if (this.dbgGod) return;                    // bảng debug: bất tử
    if (p.iframe > 0 || this.state !== 'playing') return;
    if (Math.random() < this.stats.dodge) {
      FloatText.add(p.x, p.y - 24, 'NÉ!', '#8fa8ff', 16);
      Sfx.tone({ f: 900, f2: 1400, d: .08, type: 'sine', v: .07, exp: 1 });
      p.iframe = .25;
      return;
    }
    // NOTE: enemy dmg is already wave-scaled at spawn — do not scale again here.
    // Armor is flat reduction but can never block more than 85% of a hit.
    const real = Math.max(dmg * .15, dmg - this.stats.armor, 1);
    p.hp -= real;
    p.iframe = .55;

    FloatText.add(p.x, p.y - 26, '-' + Math.round(real), '#ff4d5e', 19);
    Particles.burst(p.x, p.y, 14, '#ff4d5e', { speed: 260, life: .4, size: 5 });
    Cam.addShake(8);
    Cam.doFlash('#ff2e4d', .32);
    UI.hurtFlash();
    Sfx.hurt();

    // Ấn Phượng Hoàng tầng 4 có thể cứu một mạng
    if (p.hp <= 0 && !Sigils.onLethal(this)) { p.hp = 0; this.die(); }
  },

  collect(o) {
    const p = this.player;
    switch (o.type) {
      case 'xp': {
        p.xp += o.value * this.stats.xpGain;
        Sfx.pickup();
        Particles.emit({ x: o.x, y: o.y, vx: 0, vy: -40, life: .3, size: 4, color: '#25f4ee' });
        while (p.xp >= p.xpNext) {
          p.xp -= p.xpNext;
          p.level++;
          p.xpNext = Math.round(5 + p.level * 4 + Math.pow(p.level, 1.62));
          this.pendingLevels++;
        }
        break;
      }
      case 'coin':
        this.gold += o.value; Sfx.coin();
        FloatText.add(o.x, o.y - 10, '+' + o.value, '#ffc93c', 14);
        break;
      case 'heart': {
        // Tim cũng phải rút từ hũ có trần: số tim tỉ lệ số mạng hạ được, cuối game vô hạn.
        const give = Math.min(o.value, this.healPool);
        this.healPool -= give;
        const h = Math.min(give, p.maxHp - p.hp);
        p.hp = Math.min(p.maxHp, p.hp + give);
        Sfx.heal();
        FloatText.add(p.x, p.y - 28, '+' + Math.round(h), '#3affa0', 18);
        Particles.burst(p.x, p.y, 12, '#3affa0', { speed: 160, life: .5, size: 5 });
        break;
      }
      case 'magnet': {
        for (const q of this.pickups.active) if (q.type === 'xp') q.mag = true;
        Sfx.chest();
        UI.announce('HÚT TOÀN BẢN ĐỒ', '#4de1ff');
        Particles.ring(p.x, p.y, 500, '#4de1ff', .7, 6);
        break;
      }
      case 'nuke': {
        Cam.addShake(20); Cam.doFlash('#fff', .9);
        Sfx.explode(true);
        this.slowmoT = .5;
        for (const e of this.enemies.active.slice()) {
          if (e.boss) { this.damageEnemy(e, 400 * this.stats.damage, {}); continue; }
          this.explode(e.x, e.y, 60, 999999, '#ffe23c', false, 0);
        }
        UI.announce('THANH TẨY!', '#ffe23c');
        break;
      }
      case 'chest': {
        Sfx.chest();
        this.pendingLevels += 2;
        this.gold += 40;
        UI.announce('RƯƠNG BÁU!', '#ffc93c');
        Particles.burst(o.x, o.y, 40, '#ffc93c', { speed: 320, life: .8, size: 6 });
        break;
      }
    }
  },

  /* ===================== waves ===================== */
  updateWave(dt) {
    if (this.waveState === 'clear') return;

    /* MAP TEST (bảng debug): giữ nguyên số màn và không cho đồng hồ chạy hết, nên
       không sang màn và KHÔNG tự gọi trùm — trùm chỉ ra khi bấm nút trong bảng debug. */
    if (this.dbgLockWave) { this.wave = this.dbgLockWave; this.waveTime = 99999; }

    if (this.bossActive) {
      if (this.bossActive.dead) { this.bossActive = null; this.clearBossRule(); }
      else { UI.updateBossBar(this.bossActive); this.tickBossRule(dt); }
      // keep spawning a trickle during boss
      this.spawnT -= dt;
      if (this.spawnT <= 0) {
        this.spawnT = 1.5;
        if (this.enemies.count < 90) this.spawnWaveEnemy();
      }
      return;
    }

    this.waveTime -= dt;
    UI.updateWaveTimer(this.waveTime);

    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      // Sàn nhịp sinh và cỡ mỗi lượt được nới ở màn cao: từ màn ~16 trở đi nhịp cũ đã
      // chạm sàn .13 nên độ khó ngừng tăng, quái chết trước khi kịp tới gần và ván đấu
      // thành bất khả bại (đo được: bot đi từ màn 15 tới 36 không mất một giọt máu).
      const interval = Math.max(.085, .70 - this.wave * .035);
      this.spawnT = interval;
      // tới màn 12 giữ đúng như cũ, sau đó mỗi 4 màn thêm 1 con mỗi lượt
      const batch = 1 + Math.floor(this.wave / 3) + Math.max(0, Math.floor((this.wave - 12) / 4));
      const cap = Math.min(260, 60 + this.wave * 14);
      for (let i = 0; i < batch && this.enemies.count < cap; i++) this.spawnWaveEnemy();
    }

    if (this.waveTime <= 0) {
      if (this.wave % 5 === 0) this.startBoss();
      else this.endWave();
    }
  },

  spawnWaveEnemy() {
    const avail = SPAWN_TABLE.filter(s => this.wave >= s.from);
    const chosen = wpick(avail);
    const pos = this.edgeSpawnPos();
    // giữ nguyên độ dốc cũ, chỉ nới TRẦN từ .16 lên .24 (trần cũ chạm ở màn 19 rồi đứng)
    const elite = Math.random() < Math.min(.24, .012 + this.wave * .008);
    this.spawnEnemy(chosen.id, pos.x, pos.y, elite);
  },

  /** a point just outside the visible rectangle, so enemies walk in quickly */
  edgeSpawnPos() {
    const p = this.player;
    const hw = this.W / 2 / Cam.zoom + rand(40, 110);
    const hh = this.H / 2 / Cam.zoom + rand(40, 110);
    let x, y;
    if (Math.random() < hw / (hw + hh)) {          // top / bottom edge
      x = p.x + rand(-hw, hw);
      y = p.y + (Math.random() < .5 ? -hh : hh);
    } else {                                       // left / right edge
      x = p.x + (Math.random() < .5 ? -hw : hw);
      y = p.y + rand(-hh, hh);
    }
    const B = this.arena - 40;
    x = clamp(x, -B, B); y = clamp(y, -B, B);
    return { x, y };
  },

  spawnEnemy(id, x, y, elite) {
    if (this.enemies.count > 300) return null;
    const def = ENEMIES[id];
    if (!def) return null;
    const w = this.wave;
    // Máu quái: tới màn 10 GIỮ ĐÚNG NHƯ CŨ (số mũ 1.75), từ màn 11 số mũ dốc dần lên.
    // Đây là chỗ chữa bệnh "về sau quái quá yếu, không thể thua": sức mạnh người chơi cộng
    // dồn theo hàm mũ (6 vũ khí × 6 trang bị × 3 ấn ký) nên đường cong máu quái phải dốc
    // theo, không thì cuối game thành đi bộ. Kết quả: màn 20 +12%, màn 35 +74%, màn 45 +165%.
    const ex = w <= 10 ? 1.75 : 1.75 + (w - 10) * .012;
    const hpMul = 1 + (w - 1) * .30 + Math.pow(w, ex) * .014;
    const dmgMul = 1 + (w - 1) * .11;
    const spdMul = Math.min(1.55, 1 + (w - 1) * .014);
    return this.enemies.spawn({
      def, type: id, x, y,
      hp: def.hp * hpMul * (elite ? 5 : 1),
      dmg: def.dmg * dmgMul,
      xp: def.xp,
      scale: elite ? 1.45 : 1,
      spdMul: spdMul * (elite ? .88 : 1),
      elite
    });
  },

  /** Bật luật đấu trường của trùm. Gọi đúng 1 lần lúc trùm xuất hiện. */
  applyBossRule(id) {
    this.bossRule = id;
    this.eclipseT = 0;
    const r = BOSS_RULES[id];
    if (!r) return;
    UI.showBossRule(r);
    // báo luật SAU tên trùm 1 nhịp để người chơi kịp đọc, dùng đồng hồ
    // theo thời gian game (không phải setTimeout) nên tạm dừng là dừng theo.
    this.after(1.15, () => {
      if (this.bossRule === id) { UI.announce(r.name, r.color); Cam.doFlash(r.color, .45); }
    });
  },

  /** Các luật cần chạy mỗi khung hình. Chỉ gọi khi trùm còn sống. */
  tickBossRule(dt) {
    if (this.bossRule === 'eclipse') {
      // NHẬT THỰC: bóng tối khép lại trong 2,5 giây đầu rồi giữ nguyên
      this.eclipseT = Math.min(1, this.eclipseT + dt / 2.5);
    } else if (this.bossRule === 'collapse') {
      // THU HẸP: đấu trường co dần, nhưng CHẶN ở 42% để còn chỗ né đạn.
      // Nếu để co về 0 thì không phải khó, mà là không thể thắng.
      const floorR = this.ARENA_FULL * .42;
      if (this.arena > floorR) this.arena = Math.max(floorR, this.arena - 46 * dt);
    }
  },

  /** Gỡ luật + trả đấu trường về kích thước gốc. */
  clearBossRule() {
    this.bossRule = null;
    this.eclipseT = 0;
    this.arena = this.ARENA_FULL;
    UI.hideBossRule();
  },

  /** idx bỏ trống = chọn theo màn. Bảng debug truyền idx để gọi đích danh một con. */
  startBoss(idx) {
    // QUAY VÒNG chứ không kẹp ở con cuối — hết 8 con thì quay lại con đầu,
    // độ khó về sau do `tier` bên dưới lo.
    if (idx === undefined) idx = Math.floor(this.wave / 5) - 1;
    idx = ((idx % BOSSES.length) + BOSSES.length) % BOSSES.length;
    const bd = BOSSES[idx];
    const tier = Math.floor((this.wave - 1) / 15);
    const pos = this.edgeSpawnPos();
    const hp = bd.hp * (1 + tier * 2.4) * (1 + (this.wave - 5) * .12);
    const e = this.enemies.spawn({
      def: { sprite: bd.sprite, r: bd.r, hp: bd.hp, spd: bd.spd, dmg: bd.dmg, xp: bd.xp, color: bd.color, ai: 'boss' },
      type: 'boss', x: pos.x, y: pos.y,
      hp, dmg: bd.dmg * (1 + this.wave * .06), xp: bd.xp,
      boss: true, bossDef: bd, name: bd.name
    });
    e.spawnT = 1;
    this.bossActive = e;
    this.applyBossRule(bd.rule);
    UI.showBossBar(bd.name, bd.color);
    UI.announce(bd.name, bd.color);
    Sfx.bossWarn();
    Cam.addShake(16);
    Sfx.setIntensity(1);
  },

  endWave() {
    /* MAP TEST: không sang màn, chỉ mở lại nhịp sinh quái (dùng khi hạ xong con trùm
       được gọi bằng tay từ bảng debug). */
    if (this.dbgLockWave) {
      this.waveState = 'fight';
      this.waveTime = 99999;
      this.spawnT = .3;
      this.ebullets.clear();
      return;
    }

    this.waveState = 'clear';
    // clear remaining enemies into xp
    for (const e of this.enemies.active.slice()) {
      if (e.dead) continue;
      Particles.burst(e.x, e.y, 8, e.color, { speed: 200, life: .4, size: 4 });
      this.pickups.spawn(e.x, e.y, 'xp', 1);
      e.dead = true;
    }
    this.ebullets.clear();
    Sfx.waveClear();
    UI.announce('HOÀN THÀNH MÀN ' + this.wave, '#b6ff3a');

    // heal
    const p = this.player;
    const heal = p.maxHp * .18;
    p.hp = Math.min(p.maxHp, p.hp + heal);

    this.wave++;
    Save.data.best = Math.max(Save.data.best || 0, this.wave - 1);
    Save.save();
    UI.updateHUD();

    this.after(1.4, () => {
      this.pendingLevels++;             // free upgrade between waves
      this.waveDur = Math.min(46, 30 + this.wave);
      this.waveTime = this.waveDur;
      this.waveState = 'fight';
      this.spawnT = .4;
      Sfx.setIntensity(clamp(.15 + this.wave * .055, 0, 1));
      UI.announce('MÀN ' + this.wave, '#25f4ee');
      Sfx.waveStart();
    });
  },

  die() {
    this.state = 'dead';
    this.clearBossRule();     // chết giữa trận trùm cũng phải gỡ luật, đừng để
    UI.hideBossBar();         // huy hiệu treo lại trên màn hình kết thúc
    this.slowmoT = 0; this.slowmo = 1;
    Cam.addShake(20);
    Cam.doFlash('#ff2e4d', 1);
    Particles.burst(this.player.x, this.player.y, 60, this.player.ch.color, { speed: 460, life: 1, size: 8 });
    Sfx.gameOver();
    Sfx.stopMusic();
    const d = Save.data;
    d.runs = (d.runs || 0) + 1;
    d.totalKills = (d.totalKills || 0) + this.kills;
    d.bestKills = Math.max(d.bestKills || 0, this.kills);
    d.best = Math.max(d.best || 0, this.wave - 1);
    Save.save();
    setTimeout(() => UI.showGameOver(), 1000);
  },

  /* ===================== upgrade offers ===================== */
  offers(n = 3) {
    const out = [];
    const pool = [];

    // evolutions first (high priority)
    for (const w of this.weapons) {
      const def = WEAPONS[w.id];
      if (w.evolved || w.lv < def.max) continue;
      const pas = this.passives.find(p => p.id === def.pairId);
      if (pas && pas.lv >= 3) {
        out.push({ kind: 'evo', id: w.id, def });
      }
    }

    // weapon upgrades
    for (const w of this.weapons) {
      const def = WEAPONS[w.id];
      if (w.lv < def.max) pool.push({ kind: 'wup', id: w.id, def, lv: w.lv + 1, w: 10 });
    }
    // new weapons
    if (this.weapons.length < 6) {
      for (const id in WEAPONS) {
        if (this.weapons.some(w => w.id === id)) continue;
        pool.push({ kind: 'wnew', id, def: WEAPONS[id], lv: 1, w: 7 });
      }
    }
    // passives
    for (const id in PASSIVES) {
      const def = PASSIVES[id];
      const have = this.passives.find(p => p.id === id);
      if (have && have.lv >= def.max) continue;
      if (!have && this.passives.length >= 6) continue;
      pool.push({ kind: 'pas', id, def, lv: have ? have.lv + 1 : 1, w: have ? 9 : 6 });
    }
    // ẤN KÝ — tầng cuối chỉ hiện ra khi đã đủ chỉ số điều kiện
    for (const id in SIGILS) {
      const def = SIGILS[id];
      const have = this.sigils.find(s => s.id === id);
      if (!have) {
        if (this.sigils.length >= 3) continue;
        pool.push({ kind: 'sig', id, def, lv: 1, w: 5 });
        continue;
      }
      if (have.lv >= def.max) continue;
      const next = have.lv + 1;
      if (next === def.max && !Sigils.reqMet(this, def)) continue;   // chưa đủ chỉ số -> khoá
      pool.push({ kind: 'sig', id, def, lv: next, w: next === def.max ? 16 : 8 });
    }

    shuffle(pool);
    const picked = [];
    while (out.length + picked.length < n && pool.length) {
      const it = wpick(pool);
      pool.splice(pool.indexOf(it), 1);
      picked.push(it);
    }
    const res = out.concat(picked).slice(0, n);
    if (!res.length) res.push({ kind: 'heal' });
    return res;
  },

  applyOffer(o) {
    switch (o.kind) {
      case 'evo': {
        const w = this.weapons.find(x => x.id === o.id);
        w.evolved = true;
        UI.announce('TIẾN HOÁ!', '#ffc93c');
        Cam.doFlash('#ffc93c', .7);
        Particles.burst(this.player.x, this.player.y, 50, '#ffc93c', { speed: 400, life: .9, size: 7 });
        break;
      }
      case 'wup': this.weapons.find(x => x.id === o.id).lv++; break;
      case 'wnew': this.weapons.push({ id: o.id, lv: 1, t: 0, evolved: false }); break;
      case 'pas': {
        const p = this.passives.find(x => x.id === o.id);
        if (p) p.lv++; else this.passives.push({ id: o.id, lv: 1 });
        this.recalc(false);
        break;
      }
      case 'sig': {
        const s = this.sigils.find(x => x.id === o.id);
        if (s) s.lv++;
        else this.sigils.push({ id: o.id, lv: 1, n: 0, t: 3, used: false });
        this.recalc(false);
        if (o.lv === o.def.max) {              // tầng cuối: làm cho hoành tráng
          UI.announce('THỨC TỈNH!', o.def.color);
          Cam.doFlash(o.def.color, .85);
          Cam.addShake(10);
          Particles.shockwave(this.player.x, this.player.y, 380, o.def.color);
          Particles.burst(this.player.x, this.player.y, 60, o.def.color, { speed: 420, life: 1, size: 8 });
          Sfx.chest();
        }
        break;
      }
      case 'heal':
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp * .4);
        break;
    }
    Particles.burst(this.player.x, this.player.y, 24, '#fff', { speed: 300, life: .6, size: 5 });
    Cam.addShake(4);
    UI.updateHUD();
  },

  /* ===================== render ===================== */
  draw() {
    const g = this.ctx;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.fillStyle = '#4a3526';
    g.fillRect(0, 0, this.W, this.H);

    g.save();
    Cam.apply(g);

    this.drawBackground(g);

    // ground fx: aura circle
    const aw = this.weapons.find(w => w.id === 'aura');
    if (aw) {
      const s = WEAPONS.aura.stat(aw.lv);
      const R = s.r * this.stats.area * (aw.evolved ? 1.35 : 1);
      const p = this.player;
      g.save();
      g.globalCompositeOperation = 'source-over';   // theme truyện tranh: KHÔNG cộng sáng, nền kem sáng sẽ bị trắng xoá
      const grd = g.createRadialGradient(p.x, p.y, R * .25, p.x, p.y, R);
      const c = aw.evolved ? '#c14dff' : '#b6ff3a';
      grd.addColorStop(0, rgba(c, .02));
      grd.addColorStop(.72, rgba(c, .1));
      grd.addColorStop(1, rgba(c, .28));
      g.fillStyle = grd;
      g.beginPath(); g.arc(p.x, p.y, R, 0, TAU); g.fill();
      g.strokeStyle = rgba(c, .55 + Math.sin(this.time * 5) * .18);
      g.lineWidth = 2.5;
      g.beginPath(); g.arc(p.x, p.y, R, 0, TAU); g.stroke();
      g.restore();
    }

    // frost novas
    for (const n of this.novas) {
      const t = 1 - n.life / n.maxLife;
      g.save(); g.globalCompositeOperation = 'source-over';   // theme truyện tranh: KHÔNG cộng sáng, nền kem sáng sẽ bị trắng xoá
      g.globalAlpha = (1 - t) * .55;
      const grd = g.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * (0.4 + t * .8));
      grd.addColorStop(0, rgba(n.color, .5));
      grd.addColorStop(1, rgba(n.color, 0));
      g.fillStyle = grd;
      g.beginPath(); g.arc(n.x, n.y, n.r * (.4 + t * .8), 0, TAU); g.fill();
      g.restore();
    }

    // vùng hiệu ứng của vũ khí tiến hoá (vũng điện, hố phóng xạ, bão tuyết)
    for (const z of this.zones) {
      const t = clamp(z.life / z.maxLife, 0, 1);
      g.save();
      g.globalCompositeOperation = 'source-over';   // theme truyện tranh: KHÔNG cộng sáng, nền kem sáng sẽ bị trắng xoá
      const grd = g.createRadialGradient(z.x, z.y, 0, z.x, z.y, z.r);
      grd.addColorStop(0, rgba(z.color, .30 * t));
      grd.addColorStop(.72, rgba(z.color, .15 * t));
      grd.addColorStop(1, rgba(z.color, 0));
      g.fillStyle = grd;
      g.beginPath(); g.arc(z.x, z.y, z.r, 0, TAU); g.fill();
      g.strokeStyle = rgba(z.color, .45 * t);
      g.lineWidth = 2;
      g.beginPath(); g.arc(z.x, z.y, z.r, 0, TAU); g.stroke();
      g.restore();
    }

    // ấn ký: lỗ đen, vũng lửa (nằm dưới quái)
    Sigils.draw(g, this);

    // vòng ngắm khi đang lái bằng chuột
    if (Input.mouseActive) {
      g.save();
      g.globalCompositeOperation = 'source-over';   // theme truyện tranh: KHÔNG cộng sáng, nền kem sáng sẽ bị trắng xoá
      const cr = 13 + Math.sin(this.time * 9) * 2.5;
      g.strokeStyle = 'rgba(37,244,238,.75)'; g.lineWidth = 2;
      g.beginPath(); g.arc(Input.cursorX, Input.cursorY, cr, 0, TAU); g.stroke();
      g.fillStyle = 'rgba(37,244,238,.9)';
      g.beginPath(); g.arc(Input.cursorX, Input.cursorY, 2.5, 0, TAU); g.fill();
      g.restore();
    }

    // pickups
    const pa = this.pickups.active;
    for (let i = 0; i < pa.length; i++) drawPickup(g, this, pa[i]);

    // enemy bullets
    g.save(); g.globalCompositeOperation = 'source-over';   // theme truyện tranh: KHÔNG cộng sáng, nền kem sáng sẽ bị trắng xoá
    const spr = Art.get('b_enemy');
    const eb = this.ebullets.active;
    for (let i = 0; i < eb.length; i++) {
      const b = eb[i];
      g.save(); g.translate(b.x, b.y); g.rotate(b.rot); g.scale(.85, .85);
      g.drawImage(spr, -spr.width / 2, -spr.height / 2); g.restore();
    }
    g.restore();

    // enemies (sorted by y for depth)
    const ea = this.enemies.active;
    const sorted = ea.length < 400 ? ea.slice().sort((a, b) => a.y - b.y) : ea;
    for (let i = 0; i < sorted.length; i++) drawEnemy(g, this, sorted[i]);

    if (this.player && this.state !== 'menu') drawPlayer(g, this);

    // player bullets
    g.save(); g.globalCompositeOperation = 'source-over';   // theme truyện tranh: KHÔNG cộng sáng, nền kem sáng sẽ bị trắng xoá
    const ba = this.bullets.active;
    for (let i = 0; i < ba.length; i++) drawBullet(g, this, ba[i]);
    g.restore();

    // beams
    g.save(); g.globalCompositeOperation = 'source-over';   // theme truyện tranh: KHÔNG cộng sáng, nền kem sáng sẽ bị trắng xoá
    for (const b of this.beams) {
      const t = b.life / b.maxLife;
      const w = b.w * t;
      g.save();
      g.translate(b.x, b.y); g.rotate(b.a);
      const grd = g.createLinearGradient(0, 0, b.len, 0);
      const bc = b.color || '#ff2e88';
      grd.addColorStop(0, rgba(bc, .9));
      grd.addColorStop(.15, rgba(bc, .95));
      grd.addColorStop(1, rgba(bc, 0));
      g.fillStyle = grd;
      g.fillRect(0, -w / 2, b.len, w);
      g.fillStyle = 'rgba(255,255,255,' + (t * .95) + ')';
      g.fillRect(0, -w * .18, b.len * .96, w * .36);
      g.restore();
    }
    // lightning arcs
    for (const a of this.arcs) {
      const t = a.life / a.maxLife;
      g.strokeStyle = rgba(a.color || '#c9a8ff', t);
      g.lineWidth = 5 * t;
      this.jaggedLine(g, a.x1, a.y1, a.x2, a.y2, a.seed, 14);
      g.strokeStyle = 'rgba(255,255,255,' + (t * .9) + ')';
      g.lineWidth = 2 * t;
      this.jaggedLine(g, a.x1, a.y1, a.x2, a.y2, a.seed, 14);
    }
    g.restore();

    Particles.draw(g);
    FloatText.draw(g);

    g.restore();

    // ---- screen overlays ----
    Sigils.drawOverlay(g, this);
    this.drawEclipse(g);

    if (Cam.flash > 0) {
      g.globalCompositeOperation = 'source-over';   // theme truyện tranh: KHÔNG cộng sáng, nền kem sáng sẽ bị trắng xoá
      g.globalAlpha = Cam.flash * .5;
      g.fillStyle = Cam.flashColor;
      g.fillRect(0, 0, this.W, this.H);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }
    // vignette
    const vg = g.createRadialGradient(this.W / 2, this.H / 2, Math.min(this.W, this.H) * .34,
      this.W / 2, this.H / 2, Math.max(this.W, this.H) * .78);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,.62)');
    g.fillStyle = vg;
    g.fillRect(0, 0, this.W, this.H);

    // low hp pulse
    const p = this.player;
    if (p && this.state === 'playing' && p.hp / p.maxHp < .3) {
      const a = (.18 + Math.sin(this.time * 7) * .12) * (1 - p.hp / p.maxHp / .3);
      g.globalCompositeOperation = 'source-over';   // theme truyện tranh: KHÔNG cộng sáng, nền kem sáng sẽ bị trắng xoá
      const rg = g.createRadialGradient(this.W / 2, this.H / 2, Math.min(this.W, this.H) * .3,
        this.W / 2, this.H / 2, Math.max(this.W, this.H) * .7);
      rg.addColorStop(0, 'rgba(255,0,40,0)');
      rg.addColorStop(1, 'rgba(255,0,40,' + Math.max(0, a) + ')');
      g.fillStyle = rg; g.fillRect(0, 0, this.W, this.H);
      g.globalCompositeOperation = 'source-over';
    }
  },

  jaggedLine(g, x1, y1, x2, y2, seed, segs) {
    g.beginPath();
    g.moveTo(x1, y1);
    const dx = (x2 - x1) / segs, dy = (y2 - y1) / segs;
    const nx = -(y2 - y1), ny = (x2 - x1);
    const nl = Math.hypot(nx, ny) || 1;
    for (let i = 1; i < segs; i++) {
      const s = Math.sin(seed + i * 12.9898) * 43758.5453;
      const j = (s - Math.floor(s) - .5) * 22;
      g.lineTo(x1 + dx * i + nx / nl * j, y1 + dy * i + ny / nl * j);
    }
    g.lineTo(x2, y2);
    g.stroke();
  },

  /* NHẬT THỰC — bóng tối bọc quanh người chơi, vẽ ở toạ độ MÀN HÌNH nên
     phải gọi sau g.restore(). Chừa một vòng sáng đủ rộng để vẫn thấy đạn
     bay tới; tối hẳn thì không phải khó, chỉ là chết oan. */
  drawEclipse(g) {
    if (this.bossRule !== 'eclipse' || this.eclipseT <= 0) return;
    const p = this.player;
    if (!p) return;
    const sx = (p.x - Cam.x) * Cam.zoom + this.W / 2 + Cam.ox;
    const sy = (p.y - Cam.y) * Cam.zoom + this.H / 2 + Cam.oy;
    const rIn = 190 * Cam.zoom;
    const rOut = 430 * Cam.zoom;
    const a = this.eclipseT * .93;
    const grd = g.createRadialGradient(sx, sy, rIn, sx, sy, rOut);
    grd.addColorStop(0, 'rgba(6,3,2,0)');
    grd.addColorStop(.55, `rgba(10,4,2,${a * .72})`);
    grd.addColorStop(1, `rgba(4,2,1,${a})`);
    g.fillStyle = grd;
    g.fillRect(0, 0, this.W, this.H);
    // vành nhật hoa mờ ở rìa vùng sáng, cho biết đây là hiệu ứng chứ không phải lỗi
    g.save();
    g.globalCompositeOperation = 'source-over';   // theme truyện tranh: KHÔNG cộng sáng, nền kem sáng sẽ bị trắng xoá
    g.globalAlpha = this.eclipseT * .18;
    g.strokeStyle = '#ff6a2e'; g.lineWidth = 2;
    g.beginPath(); g.arc(sx, sy, rIn, 0, TAU); g.stroke();
    g.restore();
  },

  /**
   * SÀN BẾP kiểu truyện tranh: gạch men vuông hai màu kem, đường vữa tối, viền mực dày.
   * Bản gốc (`main`) là lưới neon xanh trên nền đen — đổi hẳn ở nhánh theme này.
   * Ngoài đấu trường là sàn gỗ tối, để người chơi thấy rõ đâu là mép sân.
   */
  drawBackground(g) {
    const A = this.arena;
    const z = Cam.zoom;
    const vw = this.W / z, vh = this.H / z;
    const x0 = Cam.x - vw / 2, x1 = Cam.x + vw / 2;
    const y0 = Cam.y - vh / 2, y1 = Cam.y + vh / 2;

    /* nền kem */
    g.fillStyle = '#f7ecd6';
    g.fillRect(x0 - 10, y0 - 10, vw + 20, vh + 20);

    /* gạch men so le hai màu */
    const step = 120;
    const cx0 = Math.floor(x0 / step), cx1 = Math.ceil(x1 / step);
    const cy0 = Math.floor(y0 / step), cy1 = Math.ceil(y1 / step);
    g.fillStyle = '#eeddba';
    for (let cx = cx0; cx <= cx1; cx++) {
      for (let cy = cy0; cy <= cy1; cy++) {
        if ((cx + cy) & 1) g.fillRect(cx * step, cy * step, step, step);
      }
    }

    /* đường vữa */
    g.lineWidth = 3;
    g.strokeStyle = 'rgba(150,116,68,.32)';
    g.beginPath();
    for (let cx = cx0; cx <= cx1; cx++) { g.moveTo(cx * step, y0); g.lineTo(cx * step, y1); }
    for (let cy = cy0; cy <= cy1; cy++) { g.moveTo(x0, cy * step); g.lineTo(x1, cy * step); }
    g.stroke();

    /* ngoài đấu trường: sàn gỗ tối */
    g.fillStyle = '#4a3526';
    if (x0 < -A) g.fillRect(x0 - 10, y0 - 10, (-A) - x0 + 10, vh + 20);
    if (x1 > A) g.fillRect(A, y0 - 10, x1 - A + 10, vh + 20);
    if (y0 < -A) g.fillRect(x0 - 10, y0 - 10, vw + 20, (-A) - y0 + 10);
    if (y1 > A) g.fillRect(x0 - 10, A, vw + 20, y1 - A + 10);

    /* viền mực dày + vạch cảnh báo vàng đen ở mép sân */
    g.save();
    g.lineWidth = 16;
    g.strokeStyle = '#ffc93c';
    g.strokeRect(-A, -A, A * 2, A * 2);
    g.lineWidth = 16;
    g.setLineDash([34, 34]);
    g.strokeStyle = INK;
    g.strokeRect(-A, -A, A * 2, A * 2);
    g.setLineDash([]);
    g.lineWidth = 5;
    g.strokeStyle = INK;
    g.strokeRect(-A - 8, -A - 8, A * 2 + 16, A * 2 + 16);
    g.strokeRect(-A + 8, -A + 8, A * 2 - 16, A * 2 - 16);
    g.restore();
  }
};
