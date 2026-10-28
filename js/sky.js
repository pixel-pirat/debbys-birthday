/* ============================================================
   SKY — parallax starfield + shooting stars
   ============================================================ */
window.Sky = (function () {
  "use strict";

  var canvas = document.getElementById("sky");
  var ctx = canvas && canvas.getContext("2d");
  if (!ctx) return { start: function () {} };

  var dpr = 1,
    w = 0,
    h = 0,
    stars = [],
    shooters = [],
    raf = null,
    last = 0,
    nextShooter = 2.5 + Math.random() * 4,
    mx = 0,
    my = 0,
    tmx = 0,
    tmy = 0,
    running = false;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
  }

  function seed() {
    var target = Math.min(340, Math.max(90, Math.round((w * h) / 7200)));
    stars = [];
    for (var i = 0; i < target; i++) {
      var depth = Math.random();
      stars.push({
        x: Math.random(),
        y: Math.random(),
        d: depth,
        r: (0.35 + Math.random() * 1.35) * (0.6 + depth * 0.8),
        a: 0.18 + Math.random() * 0.62,
        tw: 0.25 + Math.random() * 1.6,
        ph: Math.random() * Math.PI * 2,
        hue: Math.random() < 0.16 ? [330, 45, 190][Math.floor(Math.random() * 3)] : 0,
        sat: Math.random() < 0.4 ? 40 + Math.random() * 50 : 0,
      });
    }
  }

  function spawnShooter() {
    var fromLeft = Math.random() < 0.65;
    var speed = 520 + Math.random() * 460;
    var ang = (fromLeft ? 0.32 : Math.PI - 0.32) + (Math.random() - 0.5) * 0.28;
    shooters.push({
      x: fromLeft ? -60 : w + 60,
      y: Math.random() * h * 0.55,
      vx: Math.cos(ang) * speed * (fromLeft ? 1 : -1),
      vy: Math.sin(ang) * speed,
      life: 1.5 + Math.random() * 0.8,
      age: 0,
      len: 120 + Math.random() * 190,
      hue: Math.random() < 0.3 ? 330 : 45,
    });
  }

  function draw(dt) {
    ctx.clearRect(0, 0, w, h);

    mx += (tmx - mx) * 0.045;
    my += (tmy - my) * 0.045;

    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var tw = 0.62 + 0.38 * Math.sin(s.ph + last * s.tw);
      var alpha = s.a * tw;
      var x = s.x * w + mx * (6 + s.d * 22);
      var y = s.y * h + my * (5 + s.d * 18);
      var col = s.hue ? "hsla(" + s.hue + "," + s.sat + "%,78%," : "rgba(255,246,255,";
      ctx.beginPath();
      ctx.fillStyle = col + alpha.toFixed(3) + ")";
      ctx.arc(x, y, s.r * (1 + s.d * 0.5), 0, 6.2832);
      ctx.fill();

      if (s.r > 1.5) {
        ctx.beginPath();
        ctx.fillStyle = col + (alpha * 0.1).toFixed(3) + ")";
        ctx.arc(x, y, s.r * 4.2, 0, 6.2832);
        ctx.fill();
      }
    }

    /* shooting stars */
    nextShooter -= dt;
    if (nextShooter <= 0) {
      spawnShooter();
      nextShooter = 4 + Math.random() * 7;
    }

    ctx.globalCompositeOperation = "lighter";
    for (var j = shooters.length - 1; j >= 0; j--) {
      var sh = shooters[j];
      sh.age += dt;
      sh.x += sh.vx * dt;
      sh.y += sh.vy * dt;
      var p = sh.age / sh.life;
      if (p >= 1 || sh.x < -300 || sh.x > w + 300 || sh.y > h + 200) {
        shooters.splice(j, 1);
        continue;
      }
      var fade = Math.sin(Math.min(1, p) * Math.PI);
      var nx = sh.vx / Math.hypot(sh.vx, sh.vy);
      var ny = sh.vy / Math.hypot(sh.vx, sh.vy);
      var tailX = sh.x - nx * sh.len;
      var tailY = sh.y - ny * sh.len;
      var g = ctx.createLinearGradient(sh.x, sh.y, tailX, tailY);
      g.addColorStop(0, "hsla(" + sh.hue + ",100%,88%," + (0.85 * fade).toFixed(3) + ")");
      g.addColorStop(0.35, "hsla(" + sh.hue + ",100%,75%," + (0.3 * fade).toFixed(3) + ")");
      g.addColorStop(1, "hsla(" + sh.hue + ",100%,70%,0)");
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.9;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(sh.x, sh.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();

      ctx.beginPath();
      ctx.fillStyle = "rgba(255,255,255," + (0.9 * fade).toFixed(3) + ")";
      ctx.arc(sh.x, sh.y, 1.8, 0, 6.2832);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  }

  function frame(now) {
    if (!running) return;
    if (!last) last = now;
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    draw(dt);
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    last = 0;
  }

  window.addEventListener("resize", resize, { passive: true });
  window.addEventListener(
    "pointermove",
    function (e) {
      tmx = (e.clientX / w - 0.5) * 2;
      tmy = (e.clientY / h - 0.5) * 2;
    },
    { passive: true }
  );
  document.addEventListener("visibilitychange", function () {
    document.hidden ? stop() : start();
  });

  resize();
  start();

  return { start: start, stop: stop };
})();
