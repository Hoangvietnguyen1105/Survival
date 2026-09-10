/* =============== NEON HORDE — bàn đo & bot kiểm thử (chỉ dùng lúc đo) ===============

   BA CÁI BẪY đã mất công mới tìm ra:

   1. main.js có vòng lặp DỰ PHÒNG bằng setTimeout khi requestAnimationFrame không chạy
      (đúng trường hợp Browser pane). Nó tiếp tục chơi game GIỮA hai lệnh đo -> số đo
      nhiễu và không lặp lại được. Phải gọi __killLoop() TRƯỚC khi đo.

   2. Nếu không vô hiệu hoá UI.showLevelUp:
      - để nguyên   -> lần lên cấp đầu tiên đặt G.state='levelup', G.update() thoát ngay,
                       sát thương đo được TỤT giả.
      - để bot chọn -> vũ khí/trang bị mọc thêm giữa lúc đo, sát thương PHỒNG giả
                       (đã đo pistol 359 dps trong khi trần lý thuyết chỉ 216).
      => __bench đặt UI.showLevelUp thành hàm rỗng.

   3. Bàn đo thiên vị vũ khí tầm gần (kiếm xoay, hào quang, băng vực): phải để quái TỰ ĐI
      VÀO vây. Luôn đối chiếu với trần lý thuyết dmg*n/cd trước khi tin con số.
*/

for (const k in Sfx) if (typeof Sfx[k] === 'function') Sfx[k] = function () {};

window.__killLoop = function () {
  const od = G.draw;
  let armed = true;
  G.draw = function () {
    if (armed) { armed = false; G.draw = od; throw new Error('nh: dung vong lap nen'); }
    return od.apply(this, arguments);
  };
  return 'armed';
};

/* ---------- bàn đo sát thương/giây ----------
   40 con tank máu màn 10 tự đi vào vây · người chơi đứng yên · chỉ số trung tính · không chí mạng */
window.__bench = function (id, evolved, secs, nEnemies, etype) {
  secs = secs || 20; nEnemies = nEnemies || 40; etype = etype || 'tank';
  G.start('ranger');
  const ow = G.updateWave, oh = G.hurtPlayer, ol = UI.showLevelUp;
  G.updateWave = function () {};
  G.hurtPlayer = function () {};
  UI.showLevelUp = function () {};
  G.wave = 10;
  const st = baseStats(); st.crit = 0; G.stats = st;
  G.player.maxHp = 1e9; G.player.hp = 1e9;
  G.weapons = [{ id: id, lv: 8, t: 0, evolved: !!evolved }];
  G.passives = []; G.sigils = [];
  Input.update = function () { this.dx = 0; this.dy = 0; };
  G.dmgDealt = 0;
  const p = G.player, steps = Math.round(secs * 60);
  let pk = 0, sh = 0, badState = 0;
  for (let i = 0; i < steps; i++) {
    Cam.W = 1280; Cam.H = 720;
    G.stats = st; G.pendingLevels = 0;
    if (G.state !== 'playing') { badState++; G.state = 'playing'; }
    let alive = 0; const ea = G.enemies.active;
    for (let j = 0; j < ea.length; j++) if (!ea[j].dead) alive++;
    for (let j = alive; j < nEnemies; j++) {
      const a = Math.random() * Math.PI * 2, d = 300 + Math.random() * 160;
      G.spawnEnemy(etype, p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, false);
    }
    G.update(1 / 60);
    if (Particles.pool.count > pk) pk = Particles.pool.count;
    if (Cam.shake > sh) sh = Cam.shake;
  }
  G.updateWave = ow; G.hurtPlayer = oh; UI.showLevelUp = ol;
  return { dps: Math.round(G.dmgDealt / secs), pk, sh: +sh.toFixed(1), nw: G.weapons.length, badState };
};

window.__avg = function (id, evo, n) {
  let s = 0, pk = 0, sh = 0, bad = 0, nw = 0; n = n || 3;
  for (let i = 0; i < n; i++) {
    const r = __bench(id, evo, 20);
    s += r.dps; if (r.pk > pk) pk = r.pk; if (r.sh > sh) sh = r.sh;
    bad += r.badState; nw = Math.max(nw, r.nw);
  }
  return { dps: Math.round(s / n), pk, sh, bad, nw };
};

window.__table = function (ids) {
  const out = {};
  for (const id of ids) {
    const a = __avg(id, false), b = __avg(id, true);
    out[id] = { lv8: a.dps, evo: b.dps, x: +(b.dps / a.dps).toFixed(2), pk: b.pk, sh: b.sh, bad: a.bad + b.bad, nw: Math.max(a.nw, b.nw) };
  }
  return out;
};

/* ---------- bot chơi thử cả ván ---------- */
window.__score = function (o) {
  switch (o.kind) {
    case 'evo': return 1000;
    case 'wup': return 500 + o.lv * 10;
    case 'pas': return 400 + o.lv * 10;
    case 'sig': return o.lv === o.def.max ? 700 : 300 + o.lv * 10;
    case 'wnew': return G.weapons.length < 3 ? 350 : 60;
    case 'heal': return 10;
    default: return 50;
  }
};

window.__botInput = function () {
  Input.update = function () {
    const p = G.player; let fx = 0, fy = 0; const L = G.enemies.active;
    for (let i = 0; i < L.length; i++) {
      const e = L[i]; const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < 250 && d > 1) { const w = (250 - d) / 250; fx -= (e.x - p.x) / d * w; fy -= (e.y - p.y) / d * w; }
    }
    const dc = Math.hypot(p.x, p.y); if (dc > G.arena * .63) { fx += -p.x / dc * 2.5; fy += -p.y / dc * 2.5; }
    if (!fx && !fy) { fx = Math.cos(G.time); fy = Math.sin(G.time * 1.3); }
    const m = Math.hypot(fx, fy) || 1; this.dx = fx / m; this.dy = fy / m;
  };
  UI.announce = function () {}; UI.showBossRule = function () {}; UI.hideBossRule = function () {};
  UI.showLevelUp = function () {
    const offs = G.offers(4);
    if (!offs.length) return;
    let best = offs[0], bs = -1;
    for (const o of offs) { const s = __score(o); if (s > bs) { bs = s; best = o; } }
    G.applyOffer(best);
  };
};

window.__run = function (seconds) {
  let errs = 0, lastErr = '';
  const oldErr = window.onerror; window.onerror = function (m) { errs++; lastErr = String(m); };
  const steps = seconds * 60;
  let pk = 0, sh = 0, ms = 0, nan = 0, maxEn = 0, i = 0;
  for (; i < steps; i++) {
    Cam.W = 1280; Cam.H = 720;
    const t0 = performance.now(); G.update(1 / 60); const ft = performance.now() - t0;
    if (ft > ms) ms = ft;
    if (Particles.pool.count > pk) pk = Particles.pool.count;
    if (Cam.shake > sh) sh = Cam.shake;
    if (G.enemies.count > maxEn) maxEn = G.enemies.count;
    if (!isFinite(G.player.x) || !isFinite(G.player.y) || !isFinite(G.player.hp)) nan++;
    if (G.state !== 'playing') break;
  }
  window.onerror = oldErr;
  return {
    t: +(i / 60).toFixed(0), state: G.state, wave: G.wave, kills: G.kills,
    hp: Math.round(G.player.hp) + '/' + Math.round(G.player.maxHp),
    weapons: G.weapons.map(w => w.id + ':' + w.lv + (w.evolved ? '*' : '')).join(' '),
    sigils: G.sigils.map(s => s.id + ':' + s.lv).join(' '),
    arena: G.arena, pk, sh: +sh.toFixed(1), ms: +ms.toFixed(2), maxEn, nan, errs, lastErr
  };
};

window.__soak = function (charId, seconds) {
  Cam.W = 1280; Cam.H = 720; G.resize(1280, 720);
  G.start(charId);
  __botInput();
  return __run(seconds);
};

/* ---------- bot bắt đầu ngay ở màn cuối, với bộ trang bị đã hoàn thiện ----------
   Dùng để trả lời câu "về sau quái quá yếu, không thể thua hay không". */
window.__late = function (charId, startWave, seconds, build) {
  Cam.W = 1280; Cam.H = 720; G.resize(1280, 720);
  G.start(charId);
  __botInput();
  G.wave = startWave;
  G.waveDur = Math.min(46, 30 + startWave); G.waveTime = G.waveDur;
  G.weapons = build.weapons.map(w => ({ id: w[0], lv: w[1], t: 0, evolved: !!w[2] }));
  G.passives = build.passives.map(p => ({ id: p[0], lv: p[1] }));
  G.sigils = (build.sigils || []).map(s => ({ id: s[0], lv: s[1], n: 0, t: 3, used: false }));
  G.recalc(true);
  const r = __run(seconds);
  r.waveTu = startWave;
  return r;
};

/* Bộ trang bị "hoàn thiện": 6 vũ khí cấp 8 (3 cái đã tiến hoá) + 6 trang bị tối đa + 3 ấn ký */
window.__BUILD = {
  weapons: [['lightning', 8, true], ['bomb', 8, true], ['boomerang', 8, true], ['laser', 8, false], ['aura', 8, false], ['frost', 8, false]],
  passives: [['pow', 5], ['haste', 5], ['area', 5], ['hp', 5], ['armor', 5], ['proj', 3]],
  sigils: [['thunder', 4], ['bloodmoon', 4], ['void', 4]]
};

'harness ready';
