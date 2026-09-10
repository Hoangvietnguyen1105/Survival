/* ============ NEON HORDE — bootstrap & loop ============ */
'use strict';

(function () {
  Save.load();
  G.init(document.getElementById('game'));
  Input.init();
  UI.init();

  /* nướng sẵn toàn bộ sprite ngay ở menu để trong trận không bị khựng */
  Art.warmAll();

  /* first user gesture unlocks WebAudio */
  const unlock = () => { Sfx.init(); };
  ['pointerdown', 'keydown', 'touchstart'].forEach(ev =>
    addEventListener(ev, unlock, { once: true, passive: true }));

  /* offline support (chỉ chạy khi mở qua http/https, không chạy với file://) */
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => { /* không sao */ });
    });
  }

  /* auto-pause when tab hidden */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.state === 'playing') UI.togglePause();
  });

  /* ---------- menu ambience ---------- */
  let menuT = 0;
  function menuUpdate(dt) {
    menuT += dt;
    Cam.follow(Math.cos(menuT * .09) * 420, Math.sin(menuT * .13) * 340, dt);
    Cam.update(dt);
    if (Math.random() < dt * 22) {
      const a = rand(TAU), r = rand(200, 900);
      Particles.emit({
        x: Cam.x + Math.cos(a) * r, y: Cam.y + Math.sin(a) * r,
        vx: rand(-30, 30), vy: rand(-50, -10),
        life: rand(1.2, 2.4), size: rand(2, 5),
        color: pick(['#25f4ee', '#ff2e88', '#9d6bff', '#b6ff3a']), drag: .99
      });
    }
    Particles.update(dt);
  }

  /* ---------- loop ---------- */
  let last = performance.now();
  let hudT = 0;

  function step(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > .05) dt = .05;        // clamp big hitches (tab switch)

    switch (G.state) {
      case 'playing': G.update(dt); break;
      case 'menu': menuUpdate(dt); break;
      case 'levelup':
      case 'pause':
      case 'dead':
        Cam.update(dt);
        Particles.update(dt * .25);
        FloatText.update(dt * .25);
        break;
    }

    G.draw();

    hudT -= dt;
    if (hudT <= 0 && (G.state === 'playing' || G.state === 'levelup')) {
      hudT = .07;
      UI.tickHUD();
    }
  }

  /* Normal path: requestAnimationFrame.
     Some embedded webviews never deliver rAF frames — if none arrives within
     600ms we fall back to a timer-driven loop so the game still runs. */
  let rafAlive = false;
  function rafLoop(now) { rafAlive = true; step(now); requestAnimationFrame(rafLoop); }
  requestAnimationFrame(rafLoop);

  setTimeout(() => {
    if (rafAlive) return;
    (function timerLoop() {
      step(performance.now());
      setTimeout(timerLoop, 16);
    })();
  }, 600);
})();
