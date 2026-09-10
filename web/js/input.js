/* ============ NEON HORDE — input (keyboard / touch / gamepad) ============ */
'use strict';

const Input = {
  dx: 0, dy: 0,            // normalized move direction
  keys: Object.create(null),
  dashQueued: false,
  touch: false,
  _stickId: null, _sx: 0, _sy: 0,
  elBase: null, elKnob: null, elLayer: null,
  MAXR: 52,

  /* --- điều khiển bằng chuột: giữ chuột trái, nhân vật chạy tới con trỏ --- */
  mouseHeld: false,
  mouseX: 0, mouseY: 0,
  cursorX: 0, cursorY: 0,   // toạ độ trong thế giới game (để vẽ vòng ngắm)
  mouseActive: false,       // đang thực sự lái bằng chuột?

  init() {
    this.elLayer = document.getElementById('touchLayer');
    this.elBase = document.getElementById('stickBase');
    this.elKnob = document.getElementById('stickKnob');

    addEventListener('keydown', e => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      this.keys[k] = true;
      if (k === ' ' || k === 'shift') { this.dashQueued = true; e.preventDefault(); }
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      if (k === 'escape' || k === 'p') { if (window.UI) UI.togglePause(); }
      if (k === 'm') { if (window.UI) UI.toggleMute(); }
    });
    addEventListener('keyup', e => { this.keys[e.key.toLowerCase()] = false; });
    addEventListener('blur', () => { this.keys = Object.create(null); this._release(); });

    // touch detection
    const enableTouch = () => {
      if (this.touch) return;
      this.touch = true;
      this.elLayer.classList.remove('hidden');
    };
    addEventListener('touchstart', enableTouch, { passive: true, once: true });

    const layer = this.elLayer;
    layer.addEventListener('touchstart', e => {
      for (const t of e.changedTouches) {
        if (t.target && t.target.id === 'dashBtn') continue;
        if (this._stickId !== null) continue;
        this._stickId = t.identifier;
        this._sx = t.clientX; this._sy = t.clientY;
        this.elBase.style.left = (t.clientX - 59) + 'px';
        this.elBase.style.top = (t.clientY - 59) + 'px';
        this.elBase.classList.add('on');
        this._move(t.clientX, t.clientY);
      }
      e.preventDefault();
    }, { passive: false });

    layer.addEventListener('touchmove', e => {
      for (const t of e.changedTouches)
        if (t.identifier === this._stickId) this._move(t.clientX, t.clientY);
      e.preventDefault();
    }, { passive: false });

    const end = e => {
      for (const t of e.changedTouches)
        if (t.identifier === this._stickId) this._release();
    };
    layer.addEventListener('touchend', end);
    layer.addEventListener('touchcancel', end);

    /* ---------- CHUỘT: giữ chuột trái để chạy tới con trỏ ---------- */
    const cv = document.getElementById('game');
    cv.addEventListener('mousedown', e => {
      if (e.button === 0) { this.mouseHeld = true; this.mouseX = e.clientX; this.mouseY = e.clientY; }
      if (e.button === 2) { this.dashQueued = true; }   // chuột phải = lướt
      e.preventDefault();
    });
    addEventListener('mousemove', e => { this.mouseX = e.clientX; this.mouseY = e.clientY; });
    addEventListener('mouseup', e => { if (e.button === 0) this.mouseHeld = false; });
    addEventListener('blur', () => { this.mouseHeld = false; });
    cv.addEventListener('contextmenu', e => e.preventDefault());

    const dashBtn = document.getElementById('dashBtn');
    dashBtn.addEventListener('touchstart', e => {
      e.preventDefault(); e.stopPropagation();
      this.dashQueued = true;
    }, { passive: false });
    dashBtn.addEventListener('click', e => { e.preventDefault(); this.dashQueued = true; });
  },

  _move(cx, cy) {
    let dx = cx - this._sx, dy = cy - this._sy;
    const d = Math.hypot(dx, dy);
    if (d > this.MAXR) { dx = dx / d * this.MAXR; dy = dy / d * this.MAXR; }
    this.elKnob.style.transform = `translate(${dx}px,${dy}px)`;
    if (d > 6) {
      const n = Math.max(d, 1);
      this.tdx = (cx - this._sx) / n; this.tdy = (cy - this._sy) / n;
    } else { this.tdx = 0; this.tdy = 0; }
  },
  _release() {
    this._stickId = null; this.tdx = 0; this.tdy = 0;
    if (this.elBase) { this.elBase.classList.remove('on'); this.elKnob.style.transform = 'translate(0,0)'; }
  },
  tdx: 0, tdy: 0,

  update() {
    let x = 0, y = 0;
    const k = this.keys;
    if (k['a'] || k['arrowleft'] || k['q']) x -= 1;
    if (k['d'] || k['arrowright']) x += 1;
    if (k['w'] || k['arrowup'] || k['z']) y -= 1;
    if (k['s'] || k['arrowdown']) y += 1;

    this.mouseActive = false;

    if (x || y) { const m = Math.hypot(x, y); x /= m; y /= m; }
    else if (this.tdx || this.tdy) { x = this.tdx; y = this.tdy; }
    else if (this.mouseHeld && G.player && G.state === 'playing') {
      // chạy về phía con trỏ, có vùng chết nhỏ ở giữa để không bị rung
      const w = Cam.toWorld(this.mouseX, this.mouseY);
      this.cursorX = w.x; this.cursorY = w.y;
      const ddx = w.x - G.player.x, ddy = w.y - G.player.y;
      const d = Math.hypot(ddx, ddy);
      if (d > 14) { x = ddx / d; y = ddy / d; this.mouseActive = true; }
    }
    else {
      // gamepad
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (const p of pads) {
        if (!p) continue;
        const ax = p.axes[0] || 0, ay = p.axes[1] || 0;
        if (Math.hypot(ax, ay) > .22) { x = ax; y = ay; }
        if (p.buttons[0] && p.buttons[0].pressed) {
          if (!this._padA) { this.dashQueued = true; this._padA = true; }
        } else this._padA = false;
        break;
      }
    }
    this.dx = x; this.dy = y;
  },

  consumeDash() { const d = this.dashQueued; this.dashQueued = false; return d; }
};
