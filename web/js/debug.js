/* ============ NEON HORDE — BẢNG DEBUG (chỉ dùng để căn chỉnh, không phải nội dung game) ============
 *
 *  Mở bằng nút 🔧 cạnh nút tạm dừng, hoặc phím F2.
 *
 *  Làm được gì:
 *    · Chọn ĐÚNG MỘT vũ khí (tắt hết cái khác) · đặt cấp 1–8 · bật/tắt ĐỘT PHÁ (tiến hoá)
 *    · Đặt tầng cho từng Ấn Ký, kể cả tầng 4, không cần đủ chỉ số điều kiện
 *    · MAP TEST: nhảy thẳng tới độ khó một màn bất kỳ (mặc định 30), KHÔNG có trùm,
 *      màn không bao giờ hết giờ nên đo bao lâu cũng được
 *    · Gọi riêng từng con trùm trong 8 con
 *    · Đồng hồ đo sát thương/giây + kill/giây hiện ngay trên HUD
 *
 *  File này KHÔNG được sửa hành vi game khi bảng debug chưa dùng tới. Ba móc nối duy nhất
 *  nằm trong game.js — `dbgLockWave`, `dbgGod`, `startBoss(idx)` — đều mặc định tắt.
 * ================================================================================== */
'use strict';

const Dbg = {
  wid: null,            // vũ khí đang test (null = chưa chọn, giữ nguyên bộ hiện có)
  lv: 8,
  evo: true,
  sig: {},              // { <id ấn ký>: tầng 0..4 }
  testWave: 30,
  god: false,
  meterOn: true,
  noLevel: true,        // trong MAP TEST thì chặn màn chọn thẻ (xem init)
  open: false,
  pausedByMe: false,
  built: false,

  m: { t0: 0, d0: 0, k0: 0, sumT: 0, sumD: 0, sumK: 0, dps: 0, kps: 0 },

  /* ===================== khởi động ===================== */
  init() {
    for (const id in SIGILS) this.sig[id] = 0;

    $('dbgBtn').onclick = () => this.toggle();
    $('dbgClose').onclick = () => this.hide();

    addEventListener('keydown', e => {
      if (e.code === 'F2') { e.preventDefault(); this.toggle(); }
    });

    /* ESC / nút tạm dừng: nếu bảng debug đang mở thì đóng nó trước, đừng chạy game lại
       trong khi bảng vẫn che màn hình. */
    const origToggle = UI.togglePause.bind(UI);
    UI.togglePause = () => { if (this.open) { this.hide(); return; } origToggle(); };

    /* Đồng hồ đo bám vào nhịp cập nhật HUD (theo THỜI GIAN GAME, nên tạm dừng là dừng
       theo — đừng dùng setInterval, xem mục 8 bẫy số 3 của CLAUDE.md). */
    const origTick = UI.tickHUD.bind(UI);
    UI.tickHUD = () => { origTick(); this.tickMeter(); };

    /* Trong MAP TEST phải CHẶN màn chọn thẻ: nhặt ngọc vẫn lên cấp, mà chọn thẻ thì
       game lắp thêm vũ khí/trang bị khác — hỏng luôn phép thử "chỉ một vũ khí". */
    const origLvl = UI.showLevelUp.bind(UI);
    UI.showLevelUp = () => { if (G.dbgLockWave && this.noLevel) return; origLvl(); };

    /* Trong MAP TEST đồng hồ màn được đặt 99999 giây, hiện ra thành "1666:39" rất khó coi. */
    const origTimer = UI.updateWaveTimer.bind(UI);
    UI.updateWaveTimer = t => {
      if (G.dbgLockWave) {
        const el = $('waveTimer');
        el.textContent = '∞ TEST';
        el.classList.remove('urgent');
        return;
      }
      origTimer(t);
    };

    this.meterEl = document.createElement('div');
    this.meterEl.id = 'dbgMeter';
    this.meterEl.className = 'hidden';
    $('hud').appendChild(this.meterEl);
  },

  /* ===================== mở / đóng ===================== */
  toggle() { this.open ? this.hide() : this.show(); },

  show() {
    if (G.state !== 'playing' && G.state !== 'pause') return;
    if (!this.built) { this.build(); this.built = true; }
    if (G.state === 'playing') { G.state = 'pause'; this.pausedByMe = true; }
    this.open = true;
    this.refresh();
    $('debug').classList.remove('hidden');
    Sfx.select();
  },

  hide() {
    this.open = false;
    $('debug').classList.add('hidden');
    if (this.pausedByMe && G.state === 'pause') { G.state = 'playing'; Sfx.resume(); }
    this.pausedByMe = false;
    Sfx.select();
  },

  /* ===================== dựng giao diện ===================== */
  build() {
    const root = $('dbgBody');
    root.innerHTML = '';

    /* ---- vũ khí ---- */
    root.appendChild(this.section('VŨ KHÍ — chọn 1 cái, tắt hết cái còn lại'));
    const wrap = document.createElement('div');
    wrap.className = 'dbg-grid';
    for (const id in WEAPONS) {
      const def = WEAPONS[id];
      const b = document.createElement('button');
      b.className = 'dbg-wpn';
      b.dataset.wid = id;
      b.appendChild(UI.iconEl('w_' + id, 34));
      const n = document.createElement('span');
      n.textContent = def.name;
      b.appendChild(n);
      b.style.setProperty('--ac', def.color);
      b.onclick = () => { this.wid = id; this.applyWeapon(); this.refresh(); };
      wrap.appendChild(b);
    }
    root.appendChild(wrap);

    const lvRow = document.createElement('div');
    lvRow.className = 'dbg-row';
    lvRow.appendChild(this.label('Cấp'));
    for (let i = 1; i <= 8; i++) {
      const b = document.createElement('button');
      b.className = 'dbg-num'; b.dataset.lv = i; b.textContent = i;
      b.onclick = () => { this.lv = i; this.applyWeapon(); this.refresh(); };
      lvRow.appendChild(b);
    }
    root.appendChild(lvRow);

    const evoRow = document.createElement('div');
    evoRow.className = 'dbg-row';
    const evoBtn = document.createElement('button');
    evoBtn.className = 'dbg-toggle'; evoBtn.id = 'dbgEvo';
    evoBtn.onclick = () => { this.evo = !this.evo; this.applyWeapon(); this.refresh(); };
    evoRow.appendChild(evoBtn);
    const hint = document.createElement('small');
    hint.textContent = 'Đột phá cấp cuối — bật là dùng luôn bản TIẾN HOÁ, không cần trang bị đi kèm';
    evoRow.appendChild(hint);
    root.appendChild(evoRow);

    /* ---- ấn ký ---- */
    root.appendChild(this.section('ẤN KÝ — tầng 4 mở thẳng, bỏ qua điều kiện chỉ số'));
    for (const id in SIGILS) {
      const def = SIGILS[id];
      const r = document.createElement('div');
      r.className = 'dbg-row sig';
      r.appendChild(UI.iconEl('s_' + id, 26));
      const n = document.createElement('span');
      n.className = 'dbg-signame'; n.textContent = def.name;
      n.style.color = def.color;
      r.appendChild(n);
      for (let t = 0; t <= def.max; t++) {
        const b = document.createElement('button');
        b.className = 'dbg-num'; b.dataset.sig = id; b.dataset.tier = t;
        b.textContent = t === 0 ? '–' : t;
        if (t === def.max) b.classList.add('last');
        b.onclick = () => { this.sig[id] = t; this.applySigils(); this.refresh(); };
        r.appendChild(b);
      }
      root.appendChild(r);
    }

    /* ---- trang bị ---- */
    root.appendChild(this.section('TRANG BỊ BỊ ĐỘNG'));
    const pRow = document.createElement('div');
    pRow.className = 'dbg-row';
    pRow.appendChild(this.btn('XOÁ HẾT (đo thuần vũ khí)', () => this.setPassives(false)));
    pRow.appendChild(this.btn('MAX 6 CÁI TẤN CÔNG', () => this.setPassives(true)));
    root.appendChild(pRow);
    const pHint = document.createElement('small');
    pHint.className = 'dbg-hint';
    pHint.textContent = 'So sánh vũ khí với nhau thì nên XOÁ HẾT — cùng một mốc thì con số mới nói được gì.';
    root.appendChild(pHint);

    /* ---- map test ---- */
    root.appendChild(this.section('MAP TEST — độ khó cố định, không trùm, không hết giờ'));
    const mRow = document.createElement('div');
    mRow.className = 'dbg-row';
    mRow.appendChild(this.label('Độ khó màn'));
    [10, 20, 25, 30, 35, 40, 45].forEach(w => {
      const b = document.createElement('button');
      b.className = 'dbg-num wide'; b.dataset.tw = w; b.textContent = w;
      b.onclick = () => { this.testWave = w; if (G.dbgLockWave) this.goTestMap(); this.refresh(); };
      mRow.appendChild(b);
    });
    root.appendChild(mRow);

    const mRow2 = document.createElement('div');
    mRow2.className = 'dbg-row';
    mRow2.appendChild(this.btn('VÀO MAP TEST', () => { this.goTestMap(); this.refresh(); }, 'primary'));
    mRow2.appendChild(this.btn('THOÁT MAP TEST', () => { this.exitTestMap(); this.refresh(); }));
    root.appendChild(mRow2);

    const mRow3 = document.createElement('div');
    mRow3.className = 'dbg-row';
    const godBtn = document.createElement('button');
    godBtn.className = 'dbg-toggle'; godBtn.id = 'dbgGodBtn';
    godBtn.onclick = () => { this.god = !this.god; G.dbgGod = this.god; this.refresh(); };
    mRow3.appendChild(godBtn);
    const meterBtn = document.createElement('button');
    meterBtn.className = 'dbg-toggle'; meterBtn.id = 'dbgMeterBtn';
    meterBtn.onclick = () => { this.meterOn = !this.meterOn; this.refresh(); };
    mRow3.appendChild(meterBtn);
    const lvlBtn = document.createElement('button');
    lvlBtn.className = 'dbg-toggle'; lvlBtn.id = 'dbgLvlBtn';
    lvlBtn.onclick = () => { this.noLevel = !this.noLevel; this.refresh(); };
    mRow3.appendChild(lvlBtn);
    mRow3.appendChild(this.btn('ĐẶT LẠI ĐỒNG HỒ ĐO', () => { this.resetMeter(); this.refresh(); }));
    root.appendChild(mRow3);

    const mHint = document.createElement('small');
    mHint.className = 'dbg-hint';
    mHint.textContent = 'Trong MAP TEST, màn chọn thẻ bị chặn — nếu không thì lên cấp sẽ lắp thêm vũ khí khác và hỏng phép thử.';
    root.appendChild(mHint);

    /* ---- trùm ---- */
    root.appendChild(this.section('GỌI TRÙM — máu tính theo màn hiện tại'));
    const bWrap = document.createElement('div');
    bWrap.className = 'dbg-grid';
    BOSSES.forEach((bd, i) => {
      const b = document.createElement('button');
      b.className = 'dbg-wpn boss';
      b.appendChild(UI.iconEl(bd.sprite, 34));
      const n = document.createElement('span');
      n.textContent = bd.name;
      b.appendChild(n);
      b.style.setProperty('--ac', bd.color);
      b.onclick = () => { this.callBoss(i); this.hide(); };
      bWrap.appendChild(b);
    });
    root.appendChild(bWrap);

    const bRow = document.createElement('div');
    bRow.className = 'dbg-row';
    bRow.appendChild(this.btn('GIẾT TRÙM ĐANG CÓ', () => { this.killBoss(); this.refresh(); }));
    bRow.appendChild(this.btn('XOÁ SẠCH QUÁI', () => { this.clearEnemies(); this.refresh(); }));
    root.appendChild(bRow);
  },

  /* ---------- mảnh giao diện nhỏ ---------- */
  section(t) {
    const d = document.createElement('div');
    d.className = 'dbg-sec'; d.textContent = t;
    return d;
  },
  label(t) {
    const d = document.createElement('span');
    d.className = 'dbg-lbl'; d.textContent = t;
    return d;
  },
  btn(t, fn, cls) {
    const b = document.createElement('button');
    b.className = 'dbg-btn' + (cls ? ' ' + cls : '');
    b.textContent = t;
    b.onclick = fn;
    return b;
  },

  /* ===================== vẽ lại trạng thái đang chọn ===================== */
  refresh() {
    const body = $('dbgBody');
    if (!body) return;

    body.querySelectorAll('.dbg-wpn[data-wid]').forEach(b =>
      b.classList.toggle('sel', b.dataset.wid === this.wid));
    body.querySelectorAll('.dbg-num[data-lv]').forEach(b =>
      b.classList.toggle('sel', +b.dataset.lv === this.lv));
    body.querySelectorAll('.dbg-num[data-sig]').forEach(b =>
      b.classList.toggle('sel', this.sig[b.dataset.sig] === +b.dataset.tier));
    body.querySelectorAll('.dbg-num[data-tw]').forEach(b =>
      b.classList.toggle('sel', +b.dataset.tw === this.testWave));

    const evo = $('dbgEvo');
    if (evo) {
      evo.textContent = 'ĐỘT PHÁ: ' + (this.evo ? 'BẬT' : 'TẮT');
      evo.classList.toggle('on', this.evo);
    }
    const god = $('dbgGodBtn');
    if (god) {
      god.textContent = 'BẤT TỬ: ' + (this.god ? 'BẬT' : 'TẮT');
      god.classList.toggle('on', this.god);
    }
    const mt = $('dbgMeterBtn');
    if (mt) {
      mt.textContent = 'ĐỒNG HỒ ĐO: ' + (this.meterOn ? 'BẬT' : 'TẮT');
      mt.classList.toggle('on', this.meterOn);
    }
    const lb = $('dbgLvlBtn');
    if (lb) {
      lb.textContent = 'CHẶN LÊN CẤP: ' + (this.noLevel ? 'BẬT' : 'TẮT');
      lb.classList.toggle('on', this.noLevel);
    }

    const now = $('dbgNow');
    if (now) {
      const w = G.weapons.map(x => {
        const d = WEAPONS[x.id];
        return d.name + ' c' + x.lv + (x.evolved ? ' ★' + d.evoName : '');
      }).join(' · ') || '(không có)';
      const s = G.sigils.map(x => SIGILS[x.id].name + ' t' + x.lv).join(' · ') || '(không có)';
      const p = G.passives.map(x => PASSIVES[x.id].name + ' c' + x.lv).join(' · ') || '(không có)';
      now.innerHTML =
        '<b>Màn</b> ' + G.wave + (G.dbgLockWave ? ' <em>(MAP TEST)</em>' : '') +
        ' · <b>Quái</b> ' + G.enemies.count +
        '<br><b>Vũ khí</b> ' + w +
        '<br><b>Ấn ký</b> ' + s +
        '<br><b>Trang bị</b> ' + p;
    }
  },

  /* ===================== hành động ===================== */
  applyWeapon() {
    if (!G.player) return;
    const def = WEAPONS[this.wid];
    this.lv = clamp(this.lv, 1, def.max);
    G.weapons = [{ id: this.wid, lv: this.lv, t: 0, evolved: this.evo }];
    // dọn sạch dấu vết của vũ khí trước, nếu không thì đạn/vùng cũ còn gây sát thương
    // và đồng hồ đo sẽ tính lẫn sang vũ khí mới
    G.bullets.clear();
    G.zones.length = 0; G.beams.length = 0; G.arcs.length = 0; G.novas.length = 0;
    G.player.bladeAng = 0;
    UI.updateHUD();
    this.resetMeter();
  },

  applySigils() {
    if (!G.player) return;
    G.sigils = [];
    for (const id in this.sig) {
      const lv = this.sig[id];
      if (lv > 0) G.sigils.push({ id, lv, n: 0, t: 3, used: false });
    }
    Sigils.reset();
    G.recalc(false);
    UI.updateHUD();
    this.resetMeter();
  },

  /** 6 trang bị ảnh hưởng trực tiếp tới sát thương — đúng trần 6 chỗ của game thật. */
  setPassives(max) {
    if (!G.player) return;
    G.passives = max
      ? [['pow', 5], ['haste', 5], ['area', 5], ['crit', 5], ['critd', 5], ['proj', 3]]
        .map(([id, lv]) => ({ id, lv }))
      : [];
    G.recalc(false);
    UI.updateHUD();
    this.resetMeter();
  },

  goTestMap() {
    if (!G.player) return;
    G.dbgLockWave = this.testWave;
    G.wave = this.testWave;
    G.bossActive = null;
    G.clearBossRule();
    G.enemies.clear(); G.ebullets.clear(); G.pickups.clear();
    G.bullets.clear();
    G.zones.length = 0; G.beams.length = 0; G.arcs.length = 0; G.novas.length = 0;
    G.timers.length = 0;
    Particles.clear();
    G.waveState = 'fight';
    G.waveTime = 99999;
    G.waveDur = 99999;
    G.spawnT = .3;
    G.player.x = G.player.y = 0;
    G.player.hp = G.player.maxHp;
    G.slowmo = 1; G.slowmoT = 0;
    Cam.x = Cam.y = 0; Cam.shake = 0;
    UI.hideBossBar();
    UI.announce('MAP TEST · ĐỘ KHÓ MÀN ' + this.testWave, '#ffc93c');
    UI.updateHUD();
    this.resetMeter();
  },

  exitTestMap() {
    if (!G.player) return;
    G.dbgLockWave = 0;
    G.waveDur = Math.min(46, 30 + G.wave);
    G.waveTime = G.waveDur;
    UI.announce('THOÁT MAP TEST', '#25f4ee');
    UI.updateHUD();
  },

  callBoss(idx) {
    if (!G.player || G.bossActive) return;
    G.startBoss(idx);
    this.resetMeter();
  },

  killBoss() {
    const b = G.bossActive;
    if (!b || b.dead) return;
    G.damageEnemy(b, b.hp + 1, {});
  },

  clearEnemies() {
    for (const e of G.enemies.active.slice()) {
      if (e.boss || e.dead) continue;
      e.dead = true;
    }
    G.ebullets.clear();
    this.refresh();
  },

  /* ===================== đồng hồ đo ===================== */
  resetMeter() {
    this.m = { t0: 0, d0: 0, k0: 0, sumT: 0, sumD: 0, sumK: 0, dps: 0, kps: 0 };
    G.dmgDealt = 0;
    G.kills = 0;
  },

  tickMeter() {
    const el = this.meterEl;
    if (!el) return;
    if (!this.meterOn) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');

    const m = this.m, t = G.runTime;
    if (m.t0 === 0) { m.t0 = t; m.d0 = G.dmgDealt; m.k0 = G.kills; return; }

    const dt = t - m.t0;
    if (dt >= 2) {
      m.dps = Math.round((G.dmgDealt - m.d0) / dt);
      m.kps = (G.kills - m.k0) / dt;
      m.sumT += dt; m.sumD += G.dmgDealt - m.d0; m.sumK += G.kills - m.k0;
      m.t0 = t; m.d0 = G.dmgDealt; m.k0 = G.kills;
    }
    const avg = m.sumT > 0 ? Math.round(m.sumD / m.sumT) : 0;
    const avgK = m.sumT > 0 ? (m.sumK / m.sumT).toFixed(1) : '0.0';
    el.innerHTML =
      '<b>ST/giây</b> ' + m.dps + ' <span>(TB ' + avg + ')</span>' +
      '<br><b>Kill/giây</b> ' + m.kps.toFixed(1) + ' <span>(TB ' + avgK + ')</span>' +
      '<br><span>' + Math.round(m.sumT) + 's · tổng ' + Math.round(m.sumD).toLocaleString('vi-VN') + '</span>';
  }
};
