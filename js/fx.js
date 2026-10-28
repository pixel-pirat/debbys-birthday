/* ============================================================
   FX — fireworks, confetti, sparkles
   Canvas 2D, additive blending, physics + a little theatre.
   ============================================================ */
window.FX = (function () {
  "use strict";

  var canvas = document.getElementById("fx");
  var ctx = canvas && canvas.getContext("2d");
  if (!ctx) return { launch: function () {}, burst: function () {}, celebrate: function () {} };

  var TAU = Math.PI * 2;
  var w = 0,
    h = 0,
    dpr = 1;
  var rockets = [],
    parts = [],
    confetti = [],
    raf = null,
    running = false,
    last = 0,
    autoUntil = 0,
    autoNext = 0,
    lastBoom = 0;

  var PALETTES = [
    [340, 45], // pink + gold
    [275, 190], // violet + cyan
    [45, 12], // gold + orange
    [190, 320], // cyan + magenta
    [330, 275], // pink + violet
    [160, 45], // mint + gold
  ];
  var TYPES = ["peony", "peony", "chrysanthemum", "willow", "ring", "heart", "star", "palm", "crackle"];

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }
  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }
  function chase() {
    return Math.max(0.05, Math.min(1, 1 - (performance.now() - lastBoom) / 110));
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function wake() {
    if (running) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(frame);
  }

  /* ------------------------------------------------ rockets */
  function launch(tx, ty, opts) {
    opts = opts || {};
    tx = tx == null ? rand(w * 0.14, w * 0.86) : tx;
    ty = ty == null ? rand(h * 0.1, h * 0.45) : ty;
    var sx = tx + rand(-70, 70);
    rockets.push({
      x0: sx,
      y0: h + 24,
      x1: tx,
      y1: ty,
      x: sx,
      y: h + 24,
      t: 0,
      dur: rand(0.8, 1.25),
      opts: opts,
      hue: opts.hue != null ? opts.hue : pick(PALETTES)[0],
    });
    if (!opts.silent) BdayAudio.whoosh();
    wake();
  }

  /* ------------------------------------------------ helpers */
  function addParticle(p) {
    if (parts.length > 4200) return;
    parts.push(p);
  }

  function makeParticle(x, y, vx, vy, hue, o) {
    o = o || {};
    return {
      x: x,
      y: y,
      vx: vx,
      vy: vy,
      life: o.life || rand(1.1, 2.1),
      max: o.life || 1.6,
      size: o.size || rand(1.1, 2.3),
      hue: hue,
      sat: o.sat == null ? 100 : o.sat,
      light: o.light == null ? rand(58, 74) : o.light,
      grav: o.grav == null ? 62 : o.grav,
      drag: o.drag == null ? 0.9 : o.drag,
      flick: o.flick == null ? 1 : o.flick,
      seed: Math.random() * 20,
      split: !!o.split,
      splitDone: false,
      gravPull: o.gravPull || 0,
    };
  }

  /* ------------------------------------------------ shapes */
  function heartPoint(t) {
    var x = 16 * Math.pow(Math.sin(t), 3);
    var y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    return [x / 17, -y / 17];
  }

  function starVerts(spikes, inner) {
    var v = [];
    for (var i = 0; i < spikes * 2; i++) {
      var a = -Math.PI / 2 + (i * Math.PI) / spikes;
      var r = i % 2 === 0 ? 1 : inner;
      v.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    return v;
  }

  function samplePath(fn, n, closed) {
    var pts = [];
    for (var i = 0; i < n; i++) {
      var t = closed ? i / n : i / (n - 1);
      pts.push(fn(t));
    }
    return pts;
  }

  /* ------------------------------------------------ explosion */
  function explode(x, y, o) {
    o = o || {};
    var type = o.type || pick(TYPES);
    var pal = o.hue != null ? [o.hue, (o.hue + rand(90, 220)) % 360] : pick(PALETTES);
    var hueA = pal[0],
      hueB = Math.random() < 0.62 ? pal[1] : pal[0];
    var power = o.power || rand(0.85, 1.3);
    var mobile = w < 760;
    var base = mobile ? 0.66 : 1;
    var n = Math.round((o.count || rand(80, 132)) * base);
    var i, a, sp, pp;

    if (type === "willow") {
      n = Math.round(n * 0.85);
      for (i = 0; i < n; i++) {
        a = rand(0, TAU);
        sp = rand(60, 250) * power;
        addParticle(
          makeParticle(x, y, Math.cos(a) * sp, Math.sin(a) * sp, hueA, {
            life: rand(2.4, 3.6),
            size: rand(1, 1.9),
            grav: 96,
            drag: 0.42,
            sat: 92,
            light: rand(62, 78),
            flick: 1.15,
          })
        );
      }
      addParticle(
        makeParticle(x, y, 0, 0, hueB, { life: 0.3, size: 26, grav: 0, drag: 0, light: 90 })
      );
    } else if (type === "ring") {
      var tilt = rand(0.28, 0.62);
      for (i = 0; i < n; i++) {
        a = (i / n) * TAU + rand(-0.01, 0.01);
        sp = 300 * power * rand(0.97, 1.03);
        addParticle(
          makeParticle(x, y, Math.cos(a) * sp, Math.sin(a) * sp * tilt, i % 7 === 0 ? hueB : hueA, {
            life: rand(1.5, 2.2),
            size: rand(1.2, 2.2),
            grav: 40,
            drag: 0.7,
          })
        );
      }
    } else if (type === "heart") {
      for (i = 0; i < n; i++) {
        pp = heartPoint((i / n) * TAU);
        sp = 310 * power * rand(0.94, 1.06);
        addParticle(
          makeParticle(x, y, pp[0] * sp, pp[1] * sp, i % 9 === 0 ? hueB : hueA, {
            life: rand(1.5, 2.2),
            size: rand(1.3, 2.3),
            grav: 34,
            drag: 0.85,
            light: rand(62, 78),
          })
        );
      }
      addParticle(
        makeParticle(x, y, 0, 0, hueA, { life: 0.4, size: 22, grav: 0, drag: 0, light: 92 })
      );
    } else if (type === "star") {
      var verts = starVerts(5, 0.44);
      var perim = [];
      for (i = 0; i < verts.length; i++) {
        perim.push(verts[i]);
        perim.push([(verts[i][0] + verts[(i + 1) % verts.length][0]) / 2, (verts[i][1] + verts[(i + 1) % verts.length][1]) / 2]);
      }
      var starPts = perim;
      var m = starPts.length;
      for (i = 0; i < n; i++) {
        pp = starPts[Math.floor((i / n) * m)];
        var jitter = rand(0.98, 1.02);
        sp = 320 * power * jitter;
        addParticle(
          makeParticle(x, y, pp[0] * sp, pp[1] * sp, i % 8 === 0 ? hueB : hueA, {
            life: rand(1.4, 2.1),
            size: rand(1.2, 2.1),
            grav: 30,
            drag: 0.88,
          })
        );
      }
    } else if (type === "palm") {
      var strands = mobile ? 16 : 24;
      for (i = 0; i < strands; i++) {
        a = (i / strands) * TAU + rand(-0.06, 0.06);
        for (var k = 0; k < 5; k++) {
          sp = (200 + k * 46) * power * rand(0.9, 1.1);
          addParticle(
            makeParticle(x, y, Math.cos(a) * sp, Math.sin(a) * sp, hueA, {
              life: rand(1.7, 2.5),
              size: rand(1.8, 3),
              grav: 120,
              drag: 0.55,
              light: rand(55, 72),
            })
          );
        }
      }
    } else if (type === "crackle") {
      for (i = 0; i < n; i++) {
        a = rand(0, TAU);
        sp = Math.sqrt(Math.random()) * 260 * power;
        addParticle(
          makeParticle(x, y, Math.cos(a) * sp, Math.sin(a) * sp, hueA, {
            life: rand(1.2, 2.2),
            size: rand(1, 2),
            grav: 48,
            drag: 0.95,
            split: Math.random() < 0.3,
            light: rand(60, 80),
          })
        );
      }
    } else if (type === "chrysanthemum") {
      for (i = 0; i < n; i++) {
        a = (i / n) * TAU + rand(-0.04, 0.04);
        sp = 270 * power * rand(0.35, 1);
        addParticle(
          makeParticle(x, y, Math.cos(a) * sp, Math.sin(a) * sp, i % 3 === 0 ? hueB : hueA, {
            life: rand(1.5, 2.6),
            size: rand(1.1, 2.4),
            grav: 58,
            drag: 0.8,
            flick: 1.2,
          })
        );
        if (i % 6 === 0) {
          addParticle(
            makeParticle(x, y, Math.cos(a) * sp * 1.04, Math.sin(a) * sp * 1.04, 55, {
              life: rand(1.9, 2.7),
              size: 0.9,
              grav: 40,
              drag: 0.6,
              light: 82,
            })
          );
        }
      }
    } else {
      /* peony */
      for (i = 0; i < n; i++) {
        a = rand(0, TAU);
        sp = 290 * power * Math.pow(Math.random(), 0.35) * rand(0.75, 1.05);
        addParticle(
          makeParticle(x, y, Math.cos(a) * sp, Math.sin(a) * sp, i % 6 === 0 ? hueB : hueA, {
            life: rand(1.2, 2.15),
            size: rand(1.2, 2.6),
            grav: 58,
            drag: 0.95,
            light: rand(58, 76),
          })
        );
      }
    }

    /* the flash */
    parts.push({
      x: x,
      y: y,
      vx: 0,
      vy: 0,
      life: 0.22,
      max: 0.22,
      size: 46 * power,
      hue: hueA,
      sat: 100,
      light: 96,
      grav: 0,
      drag: 1,
      flash: true,
      seed: 0,
      flick: 0,
    });

    var now = performance.now();
    if (now - lastBoom > 90) {
      lastBoom = now;
      BdayAudio.boom(Math.min(1, 0.55 + power * 0.4));
    }
    wake();
  }

  /* ------------------------------------------------ confetti */
  function rainConfetti(count, o) {
    o = o || {};
    count = count || 90;
    if (w < 760) count = Math.round(count * 0.65);
    for (var i = 0; i < count; i++) {
      confetti.push({
        x: o.x != null ? o.x + rand(-30, 30) : rand(-40, w + 40),
        y: o.y != null ? o.y + rand(-10, 20) : rand(-h * 0.7, -20),
        vx: rand(-60, 60),
        vy: o.vy || rand(130, 320),
        w: rand(4, 8),
        h: rand(7, 13),
        rot: rand(0, TAU),
        vr: rand(-6, 6),
        hue: pick([340, 45, 275, 190, 12, 320, 160]),
        sway: rand(0.6, 2),
        seed: rand(0, TAU),
        life: rand(3, 5.2),
        age: 0,
      });
    }
    wake();
  }

  /* ------------------------------------------------ sparkles */
  function sparkleAt(x, y, n) {
    n = n || 8;
    for (var i = 0; i < n; i++) {
      var a = rand(0, TAU);
      var sp = rand(30, 150);
      addParticle(
        makeParticle(x, y, Math.cos(a) * sp, Math.sin(a) * sp, pick([45, 340, 190, 275]), {
          life: rand(0.35, 0.9),
          size: rand(0.8, 1.9),
          grav: 30,
          drag: 1.4,
          light: 82,
        })
      );
    }
    wake();
  }

  /* ------------------------------------------------ update */
  function update(dt) {
    var i, p, r;

    for (i = rockets.length - 1; i >= 0; i--) {
      r = rockets[i];
      r.t += dt / r.dur;
      var e = 1 - Math.pow(1 - Math.min(1, r.t), 2.2);
      var px = r.x,
        py = r.y;
      r.x = r.x0 + (r.x1 - r.x0) * e;
      r.y = r.y0 + (r.y1 - r.y0) * e;
      r.vx = (r.x - px) / Math.max(dt, 0.0001);
      r.vy = (r.y - py) / Math.max(dt, 0.0001);

      if (Math.random() < 0.75) {
        addParticle(
          makeParticle(r.x + rand(-2, 2), r.y + rand(0, 6), rand(-14, 14), rand(30, 90), r.hue, {
            life: rand(0.25, 0.6),
            size: rand(0.7, 1.6),
            grav: 8,
            drag: 1.6,
            light: 76,
          })
        );
      }

      if (r.t >= 1) {
        explode(r.x1, r.y1, r.opts);
        rockets.splice(i, 1);
      }
    }

    for (i = parts.length - 1; i >= 0; i--) {
      p = parts[i];
      if (p.flash) {
        p.life -= dt;
        if (p.life <= 0) parts.splice(i, 1);
        continue;
      }
      p.life -= dt;
      if (p.life <= 0) {
        parts.splice(i, 1);
        continue;
      }
      var damp = Math.exp(-p.drag * dt);
      p.vx *= damp;
      p.vy = p.vy * damp + p.grav * dt;

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.split && !p.splitDone && p.life < p.max * 0.42) {
        p.splitDone = true;
        for (var s = 0; s < 4; s++) {
          var sa = rand(0, TAU);
          var ss = rand(40, 120);
          addParticle(
            makeParticle(p.x, p.y, Math.cos(sa) * ss, Math.sin(sa) * ss, 50, {
              life: rand(0.35, 0.8),
              size: 1,
              grav: 40,
              drag: 1.2,
              light: 86,
            })
          );
        }
      }
    }

    for (i = confetti.length - 1; i >= 0; i--) {
      var c = confetti[i];
      c.age += dt;
      c.vy += 150 * dt;
      c.vy *= Math.exp(-0.55 * dt);
      c.vx += Math.sin(c.seed + c.age * c.sway * 3) * 34 * dt;
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.rot += c.vr * dt;
      if (c.age > c.life || c.y > h + 60) confetti.splice(i, 1);
    }
  }

  /* ------------------------------------------------ draw */
  function drawBackgroundFade() {
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "lighter";
  }

  function draw() {
    drawBackgroundFade();

    /* flashes first */
    for (var f = 0; f < parts.length; f++) {
      var fl = parts[f];
      if (!fl.flash) continue;
      var fa = Math.max(0, fl.life / fl.max);
      var g = ctx.createRadialGradient(fl.x, fl.y, 0, fl.x, fl.y, fl.size);
      g.addColorStop(0, "hsla(" + fl.hue + ",100%,96%," + (0.85 * fa).toFixed(3) + ")");
      g.addColorStop(0.4, "hsla(" + fl.hue + ",100%,80%," + (0.45 * fa).toFixed(3) + ")");
      g.addColorStop(1, "hsla(" + fl.hue + ",100%,70%,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(fl.x, fl.y, fl.size, 0, TAU);
      ctx.fill();
    }

    /* particles */
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (p.flash) continue;
      var life = p.life / p.max;
      var a = Math.pow(life, 1.55);
      var flk = p.flick === 1 ? 1 : 0.65 + 0.35 * Math.sin(p.seed + (p.max - p.life) * 26);
      ctx.globalAlpha = Math.max(0, Math.min(1, a * flk));
      var col = "hsl(" + p.hue + "," + p.sat + "%," + p.light + "%)";
      ctx.fillStyle = col;
      var sz = Math.max(0.4, p.size * (0.45 + life * 0.8));
      ctx.beginPath();
      ctx.arc(p.x, p.y, sz, 0, TAU);
      ctx.fill();
      if (sz > 1.1) {
        ctx.globalAlpha = Math.max(0, Math.min(0.16, a * 0.16));
        ctx.beginPath();
        ctx.arc(p.x, p.y, sz * 3.4, 0, TAU);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    /* rockets */
    ctx.globalCompositeOperation = "lighter";
    for (var k = 0; k < rockets.length; k++) {
      var r = rockets[k];
      var rg = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, 9);
      rg.addColorStop(0, "rgba(255,255,255,1)");
      rg.addColorStop(0.35, "hsla(" + r.hue + ",100%,80%,.8)");
      rg.addColorStop(1, "hsla(" + r.hue + ",100%,70%,0)");
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(r.x, r.y, 9, 0, TAU);
      ctx.fill();
    }

    /* confetti */
    ctx.globalCompositeOperation = "source-over";
    for (var c = 0; c < confetti.length; c++) {
      var cf = confetti[c];
      var ca = Math.min(1, (cf.life - cf.age) / 0.7);
      ctx.save();
      ctx.translate(cf.x, cf.y);
      ctx.rotate(cf.rot);
      ctx.scale(1, Math.max(0.15, Math.abs(Math.cos(cf.seed + cf.age * 2.6))));
      ctx.globalAlpha = Math.max(0, ca);
      ctx.fillStyle = "hsl(" + cf.hue + ",92%,62%)";
      ctx.fillRect(-cf.w / 2, -cf.h / 2, cf.w, cf.h);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  /* ------------------------------------------------ loop */
  function frame(now) {
    if (!running) return;
    if (!last) last = now;
    var dt = Math.min(0.042, (now - last) / 1000);
    last = now;

    if (autoUntil && now < autoUntil && now > autoNext) {
      autoNext = now + rand(190, 430);
      launch(null, null, { type: pick(TYPES) });
      if (Math.random() < 0.22) setTimeout(function () { launch(null, null, {}); }, 140);
    }

    update(dt);
    draw();

    if (rockets.length || parts.length || confetti.length || (autoUntil && now < autoUntil)) {
      raf = requestAnimationFrame(frame);
    } else {
      running = false;
      ctx.clearRect(0, 0, w, h);
    }
  }

  /* ------------------------------------------------ public */
  function celebrate(ms) {
    autoUntil = performance.now() + (ms || 4500);
    autoNext = performance.now();
    wake();
  }

  function clear() {
    rockets.length = 0;
    parts.length = 0;
    confetti.length = 0;
    autoUntil = 0;
    ctx.clearRect(0, 0, w, h);
  }

  function bigMoment() {
    var cx = w * 0.5;
    explode(cx - w * 0.2, h * 0.34, { type: "heart", power: 1.25, hue: 340 });
    setTimeout(function () {
      explode(cx + w * 0.2, h * 0.3, { type: "peony", power: 1.2, hue: 275 });
    }, 180);
    setTimeout(function () {
      explode(cx, h * 0.22, { type: "star", power: 1.35, hue: 45 });
    }, 380);
  }

  window.addEventListener("resize", resize, { passive: true });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      if (raf) cancelAnimationFrame(raf);
      raf = null;
      running = false;
    } else if (parts.length || confetti.length || rockets.length) {
      wake();
    }
  });

  resize();

  return {
    launch: launch,
    burst: explode,
    explode: explode,
    confetti: rainConfetti,
    sparkleAt: sparkleAt,
    celebrate: celebrate,
    bigMoment: bigMoment,
    clear: clear,
    wake: wake,
  };
})();
