/* ============ NEON HORDE — UI layer ============ */
'use strict';

const $ = id => document.getElementById(id);

const UI = {
  charId: 'ranger',
  rerolls: 1,
  offers: [],
  hurtEl: null,
  _annT: 0,

  init() {
    this.hurtEl = document.createElement('div');
    this.hurtEl.className = 'hurt-vig';
    $('app').appendChild(this.hurtEl);

    this.buildChars();
    this.refreshBest();

    $('playBtn').onclick = () => { Sfx.init(); Sfx.select(); this.startRun(); };
    $('howBtn').onclick = () => { Sfx.select(); $('menu').classList.add('hidden'); $('howto').classList.remove('hidden'); };
    $('howBack').onclick = () => { Sfx.select(); $('howto').classList.add('hidden'); $('menu').classList.remove('hidden'); };
    $('muteBtn').onclick = () => this.toggleMute();
    $('pauseBtn').onclick = () => this.togglePause();
    $('resumeBtn').onclick = () => this.togglePause();
    $('quitBtn').onclick = () => { Sfx.select(); this.quitToMenu(); };
    $('retryBtn').onclick = () => { Sfx.select(); this.startRun(); };
    $('menuBtn').onclick = () => { Sfx.select(); this.quitToMenu(); };
    $('rerollBtn').onclick = () => this.reroll();

    Save.load();
    if (Save.data.muted) { Sfx.muted = true; $('muteBtn').textContent = 'Âm thanh: TẮT'; }
  },

  /* ---------- helpers ---------- */
  iconEl(key, size) {
    const src = Art.get(key);
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    g.drawImage(src, 0, 0, size, size);
    return c;
  },

  refreshBest() {
    $('bestRecord').textContent = 'Màn ' + (Save.data.best || 0);
  },

  /* ---------- character select ---------- */
  buildChars() {
    const list = $('charList');
    list.innerHTML = '';
    CHARACTERS.forEach(ch => {
      const d = document.createElement('div');
      d.className = 'char' + (ch.id === this.charId ? ' sel' : '');
      d.appendChild(this.iconEl(ch.sprite, 52));
      const n = document.createElement('div'); n.className = 'cname'; n.textContent = ch.name;
      const r = document.createElement('div'); r.className = 'crole'; r.textContent = ch.role;
      d.appendChild(n); d.appendChild(r);
      d.onclick = () => {
        Sfx.init(); Sfx.select();
        this.charId = ch.id;
        [...list.children].forEach(c => c.classList.remove('sel'));
        d.classList.add('sel');
        this.showCharDesc(ch);
      };
      d.onmouseenter = () => Sfx.hover();
      list.appendChild(d);
    });
    this.showCharDesc(CHARACTERS.find(c => c.id === this.charId));
  },

  showCharDesc(ch) {
    const m = ch.mods;
    const parts = [];
    const fmt = {
      maxHp: v => `Máu ${v > 0 ? '+' : ''}${v}`,
      armor: v => `Giáp +${v}`,
      moveSpeed: v => `Tốc chạy ${v > 0 ? '+' : ''}${Math.round(v * 100)}%`,
      damage: v => `Sát thương +${Math.round(v * 100)}%`,
      haste: v => `Tốc đánh +${Math.round(v * 100)}%`,
      area: v => `Phạm vi +${Math.round(v * 100)}%`,
      crit: v => `Chí mạng +${Math.round(v * 100)}%`,
      critDmg: v => `ST chí mạng +${Math.round(v * 100)}%`,
      pickup: v => `Tầm hút +${v}`,
      proj: v => `+${v} đạn`,
      xpGain: v => `EXP +${Math.round(v * 100)}%`,
      regen: v => `Hồi máu +${v}/s`
    };
    for (const k in m) if (fmt[k]) parts.push(fmt[k](m[k]));
    $('charDesc').innerHTML =
      `${ch.desc}<br><b>${parts.join(' · ')}</b><br>` +
      `<span class="wpn">Vũ khí khởi đầu: ${WEAPONS[ch.weapon].name}</span>`;
  },

  /* ---------- run control ---------- */
  startRun() {
    Art.warmSync();          // chắc chắn mọi sprite đã sẵn sàng, không khựng giữa trận
    ['menu', 'howto', 'gameover', 'pause', 'levelup'].forEach(id => $(id).classList.add('hidden'));
    this.hideBossBar();
    $('hud').classList.remove('hidden');
    G.start(this.charId);
    this.buildSlots();
    this.updateHUD();
  },

  quitToMenu() {
    G.state = 'menu';
    G.paused = false;
    Sfx.stopMusic();
    ['gameover', 'pause', 'levelup'].forEach(id => $(id).classList.add('hidden'));
    $('hud').classList.add('hidden');
    this.hideBossBar();
    $('menu').classList.remove('hidden');
    this.refreshBest();
  },

  togglePause() {
    if (G.state === 'playing') {
      G.state = 'pause';
      this.buildStatPanel();
      $('pause').classList.remove('hidden');
      Sfx.select();
    } else if (G.state === 'pause') {
      G.state = 'playing';
      $('pause').classList.add('hidden');
      Sfx.select();
      Sfx.resume();
    }
  },

  toggleMute() {
    Sfx.init();
    const m = !Sfx.muted;
    Sfx.setMuted(m);
    Save.data.muted = m; Save.save();
    $('muteBtn').textContent = 'Âm thanh: ' + (m ? 'TẮT' : 'BẬT');
    if (!m) Sfx.select();
  },

  /* ---------- HUD ---------- */
  buildSlots() {
    this.updateHUD();
  },

  updateHUD() {
    const p = G.player;
    if (!p) return;
    const hpR = clamp(p.hp / p.maxHp, 0, 1);
    $('hpFill').style.transform = `scaleX(${hpR})`;
    $('hpText').textContent = Math.ceil(p.hp) + '/' + Math.round(p.maxHp);
    $('xpFill').style.transform = `scaleX(${clamp(p.xp / p.xpNext, 0, 1)})`;
    $('xpText').textContent = 'Lv.' + p.level;
    $('waveNum').textContent = G.wave;
    $('killCount').textContent = G.kills;
    $('goldCount').textContent = G.gold;

    // weapon slots
    const ws = $('weaponSlots');
    ws.innerHTML = '';
    for (const w of G.weapons) {
      const def = WEAPONS[w.id];
      const d = document.createElement('div');
      d.className = 'slot' + (w.lv >= def.max ? ' max' : '');
      d.appendChild(this.iconEl('w_' + w.id, 38));
      const lv = document.createElement('div');
      lv.className = 'lv';
      lv.textContent = w.evolved ? '★' : (w.lv >= def.max ? 'MAX' : w.lv);
      d.appendChild(lv);
      d.title = def.name;
      ws.appendChild(d);
    }
    const ps = $('passiveSlots');
    ps.innerHTML = '';
    for (const p2 of G.passives) {
      const def = PASSIVES[p2.id];
      const d = document.createElement('div');
      d.className = 'slot' + (p2.lv >= def.max ? ' max' : '');
      d.appendChild(this.iconEl('i_' + p2.id, 27));
      const lv = document.createElement('div');
      lv.className = 'lv'; lv.textContent = p2.lv;
      d.appendChild(lv);
      d.title = def.name;
      ps.appendChild(d);
    }

    // ô Ấn Ký
    const ss = $('sigilSlots');
    ss.innerHTML = '';
    for (const s of G.sigils) {
      const def = SIGILS[s.id];
      const maxed = s.lv >= def.max;
      const d = document.createElement('div');
      d.className = 'slot sigil' + (maxed ? ' max' : '');
      d.appendChild(this.iconEl('s_' + s.id, 27));
      const lv = document.createElement('div');
      lv.className = 'lv';
      lv.textContent = maxed ? '★' : s.lv;
      d.appendChild(lv);
      d.title = maxed ? def.awName : (def.name + ' — tầng cuối cần ' + def.req.label);
      if (!maxed && Sigils.reqMet(G, def)) d.classList.add('ready');
      ss.appendChild(d);
    }
  },

  /* fast per-frame bits */
  tickHUD() {
    const p = G.player;
    if (!p) return;
    const hpR = clamp(p.hp / p.maxHp, 0, 1);
    $('hpFill').style.transform = `scaleX(${hpR})`;
    $('hpText').textContent = Math.ceil(p.hp) + '/' + Math.round(p.maxHp);
    $('xpFill').style.transform = `scaleX(${clamp(p.xp / p.xpNext, 0, 1)})`;
    $('xpText').textContent = 'Lv.' + p.level;
    $('killCount').textContent = G.kills;
    $('goldCount').textContent = G.gold;
    if (Input.touch) $('dashBtn').classList.toggle('cool', p.dashCd > 0);
  },

  updateWaveTimer(t) {
    const el = $('waveTimer');
    el.textContent = fmtTime(t);
    el.classList.toggle('urgent', t <= 5);
  },

  showBossBar(name, color) {
    const el = $('bossName');
    el.textContent = name;
    // 8 con trùm 8 màu — tên phải ăn theo màu con đó, đừng để đỏ hết
    el.style.color = color || '';
    el.style.textShadow = color ? `0 0 12px ${color}` : '';
    $('bossBarWrap').classList.remove('hidden');
  },
  hideBossBar() { $('bossBarWrap').classList.add('hidden'); },

  /** Huy hiệu LUẬT ĐẤU TRƯỜNG — hiện suốt trận trùm để người chơi luôn
      nhớ mình đang bị bóp cái gì, đừng để họ tưởng game lỗi. */
  showBossRule(r) {
    const el = $('bossRule');
    if (!el) return;
    el.style.setProperty('--rc', r.color);
    $('bossRuleName').textContent = r.name;
    $('bossRuleDesc').textContent = r.desc;
    el.classList.remove('hidden');
  },
  hideBossRule() { const el = $('bossRule'); if (el) el.classList.add('hidden'); },
  updateBossBar(e) {
    $('bossFill').style.transform = `scaleX(${clamp(e.hp / e.maxHp, 0, 1)})`;
  },

  announce(text, color) {
    const wrap = $('announce');
    const d = document.createElement('div');
    d.className = 'ann';
    d.style.setProperty('--c', color || '#25f4ee');
    d.textContent = text;
    wrap.innerHTML = '';
    wrap.appendChild(d);
    setTimeout(() => { if (d.parentNode) d.remove(); }, 2000);
  },

  hurtFlash() {
    const e = this.hurtEl;
    if (!e) return;
    e.classList.remove('on');
    void e.offsetWidth;
    e.classList.add('on');
  },

  /* ---------- level up ---------- */
  showLevelUp() {
    G.state = 'levelup';
    this.rerolls = 1;
    this.renderOffers();
    $('lvlTitle').textContent = 'LÊN CẤP!';
    $('lvlSub').textContent = 'Chọn một nâng cấp';
    $('levelup').classList.remove('hidden');
    Sfx.levelup();
    Cam.doFlash('#ffffff', .4);
    Particles.burst(G.player.x, G.player.y, 30, '#25f4ee', { speed: 320, life: .7, size: 6 });
  },

  renderOffers() {
    this.offers = G.offers(window.innerWidth > 760 ? 4 : 3);
    const row = $('cardRow');
    row.innerHTML = '';
    this.offers.forEach((o, i) => row.appendChild(this.makeCard(o, i)));
    $('rerollLeft').textContent = this.rerolls > 0 ? 'miễn phí' : '30 vàng';
    $('rerollBtn').style.display = (this.rerolls > 0 || G.gold >= 30) ? '' : 'none';
  },

  makeCard(o, i) {
    const c = document.createElement('div');
    c.className = 'card';
    let iconKey, name, desc, tag, tagCls, color, lv = 0, max = 0;

    if (o.kind === 'evo') {
      iconKey = 'w_' + o.id; name = o.def.evoName; desc = o.def.evoDesc;
      tag = 'TIẾN HOÁ'; tagCls = 'evo'; color = '#ffc93c';
      c.classList.add('evolve');
    } else if (o.kind === 'wup') {
      iconKey = 'w_' + o.id; name = o.def.name; desc = o.def.desc(o.lv);
      tag = 'CẤP ' + o.lv; tagCls = 'up'; color = o.def.color;
      lv = o.lv; max = o.def.max;
    } else if (o.kind === 'wnew') {
      iconKey = 'w_' + o.id; name = o.def.name; desc = o.def.tip;
      tag = 'VŨ KHÍ MỚI'; tagCls = 'new'; color = o.def.color;
      lv = 1; max = o.def.max;
    } else if (o.kind === 'pas') {
      iconKey = 'i_' + o.id; name = o.def.name; desc = o.def.desc(o.lv);
      tag = 'CẤP ' + o.lv; tagCls = 'pas'; color = o.def.color;
      lv = o.lv; max = o.def.max;
    } else if (o.kind === 'sig') {
      const last = o.lv === o.def.max;
      iconKey = 's_' + o.id;
      name = last ? o.def.awName : o.def.name;
      desc = o.def.desc(o.lv);
      tag = last ? 'THỨC TỈNH' : 'TẦNG ' + o.lv;
      tagCls = last ? 'evo' : 'sig';
      color = last ? '#ffc93c' : o.def.color;
      lv = o.lv; max = o.def.max;
      if (last) c.classList.add('evolve');
    } else {
      iconKey = 'p_heart'; name = 'HỒI PHỤC'; desc = 'Hồi <em>40%</em> máu tối đa';
      tag = 'HỒI MÁU'; tagCls = 'new'; color = '#ff4d6b';
    }

    c.style.setProperty('--ac', color);
    c.style.setProperty('--gl', rgba(color, .3));

    const t = document.createElement('div');
    t.className = 'tag ' + tagCls; t.textContent = tag;
    const ic = this.iconEl(iconKey, 64); ic.className = 'ico';
    const nm = document.createElement('div'); nm.className = 'cn'; nm.textContent = name;
    const ds = document.createElement('div'); ds.className = 'cd'; ds.innerHTML = desc;

    c.appendChild(t); c.appendChild(ic); c.appendChild(nm); c.appendChild(ds);

    // Vũ khí: nói rõ cần gì để mở TIẾN HOÁ, kèm tiến độ hiện tại
    if ((o.kind === 'wup' || o.kind === 'wnew') && o.def.pairId) {
      const have = G.weapons.find(x => x.id === o.id);
      const curLv = have ? have.lv : 0;
      const pas = G.passives.find(p => p.id === o.def.pairId);
      const pasLv = pas ? pas.lv : 0;
      const ok = curLv >= o.def.max && pasLv >= 3;
      const rq = document.createElement('div');
      rq.className = 'req' + (ok ? ' ok' : '');
      rq.innerHTML = (ok ? '✓ ' : '⚡ ') + 'Tiến hoá <b>' + o.def.evoName + '</b>: ' +
        'cấp tối đa <b>(' + Math.min(curLv, o.def.max) + '/' + o.def.max + ')</b> + ' +
        PASSIVES[o.def.pairId].name + ' cấp 3 <b>(' + Math.min(pasLv, 3) + '/3)</b>';
      c.appendChild(rq);
    }

    // Ấn Ký chưa tới tầng cuối: nói rõ cần chỉ số gì mới mở khoá được
    if (o.kind === 'sig' && o.lv < o.def.max) {
      const met = Sigils.reqMet(G, o.def);
      const rq = document.createElement('div');
      rq.className = 'req' + (met ? ' ok' : '');
      rq.innerHTML = (met ? '✓ ' : '🔒 ') + 'Tầng cuối: ' + o.def.req.label +
        ' <b>(' + Sigils.reqNow(G, o.def) + ')</b>';
      c.appendChild(rq);
    }

    if (max) {
      const dots = document.createElement('div'); dots.className = 'lvdots';
      for (let k = 1; k <= max; k++) {
        const s = document.createElement('i');
        if (k <= lv) s.className = 'on';
        dots.appendChild(s);
      }
      c.appendChild(dots);
    }

    c.onmouseenter = () => Sfx.hover();
    c.onclick = () => this.pick(o);
    return c;
  },

  pick(o) {
    Sfx.select();
    G.applyOffer(o);
    $('levelup').classList.add('hidden');
    G.state = 'playing';
    Sfx.resume();
  },

  reroll() {
    if (this.rerolls > 0) this.rerolls--;
    else if (G.gold >= 30) { G.gold -= 30; this.tickHUD(); }
    else return;
    Sfx.select();
    this.renderOffers();
  },

  /* ---------- pause stats ---------- */
  buildStatPanel() {
    const s = G.stats, p = G.player;
    const rows = [
      ['Máu', `${Math.ceil(p.hp)}/${Math.round(p.maxHp)}`],
      ['Hồi máu', s.regen.toFixed(1) + '/s'],
      ['Giáp', s.armor],
      ['Né tránh', Math.round(s.dodge * 100) + '%'],
      ['Sát thương', Math.round(s.damage * 100) + '%'],
      ['Tốc đánh', Math.round(s.haste * 100) + '%'],
      ['Chí mạng', Math.round(s.crit * 100) + '%'],
      ['ST chí mạng', Math.round(s.critDmg * 100) + '%'],
      ['Phạm vi', Math.round(s.area * 100) + '%'],
      ['Đạn thêm', '+' + s.proj],
      ['Tốc chạy', Math.round(s.moveSpeed * 100) + '%'],
      ['Hút máu', (s.lifesteal * 100).toFixed(1) + '%'],
      ['Tầm hút', Math.round(s.pickup)],
      ['EXP', Math.round(s.xpGain * 100) + '%'],
      ['Tổng sát thương', fmtNum(G.dmgDealt)],
      ['Hạ gục', G.kills]
    ];
    $('statPanel').innerHTML = rows.map(r =>
      `<div><span>${r[0]}</span><b>${r[1]}</b></div>`).join('');
  },

  /* ---------- game over ---------- */
  showGameOver() {
    const beat = (G.wave - 1) >= (Save.data.best || 0) && (G.wave - 1) > 0;
    $('goTitle').textContent = beat ? 'KỶ LỤC MỚI!' : 'BẠN ĐÃ GỤC NGÃ';
    $('resultGrid').innerHTML = [
      ['MÀN', G.wave],
      ['HẠ GỤC', G.kills],
      ['THỜI GIAN', fmtTime(G.runTime)],
      ['SÁT THƯƠNG', fmtNum(G.dmgDealt)]
    ].map(r => `<div><span>${r[0]}</span><b>${r[1]}</b></div>`).join('');

    const lo = $('goLoadout');
    lo.innerHTML = '';
    for (const w of G.weapons) lo.appendChild(this.iconEl('w_' + w.id, 40));
    for (const p of G.passives) lo.appendChild(this.iconEl('i_' + p.id, 40));
    for (const s of G.sigils) lo.appendChild(this.iconEl('s_' + s.id, 40));

    $('gameover').classList.remove('hidden');
    this.refreshBest();
  }
};
