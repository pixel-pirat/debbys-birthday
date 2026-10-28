/* ============================================================
   NAMEFX — the name, assembled from stardust
   ============================================================ */
window.NameFX = (function () {
  "use strict";

  var canvas = document.getElementById("nameCanvas");
  var ctx = canvas && canvas.getContext("2d");
  if (!ctx) return { play: function () {}, setName: function () {}, resize: function () {} };

  var TAU = Math.PI * 2;
  var w = 0,
    h = 0,
    dpr = 1,
    particles = [],
    raf = null,
    running = false,
    visible = true,
    started = false,
    last = 0,
    elapsed = 0,
    name = "";

  var mouse = { x: -9999, y: -9999, active: false };

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = Math.max(1, Math.round(rect.width));
    h = Math.max(1, Math.round(rect.height));
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build(true);
  }

  function build(fresh) {
    if (!w || !h) return;
    var text = (BDAY.state.name || "You").trim() || "You";
    name = text;

    var off = document.createElement("canvas");
    off.width = w;
    off.height = h;
    var octx = off.getContext("2d");

    var probe = 200;
    octx.font = "italic 700 " + probe + 'px "Playfair Display", Georgia, "Times New Roman", serif';
    var metrics = octx.measureText(text);
    var tw = Math.max(1, metrics.width);
    var target = w * (text.length > 12 ? 0.94 : 0.86);
    var size = probe * (target / tw);
    size = Math.min(size, h * 0.86);

    octx.clearRect(0, 0, w, h);
    octx.font = "italic 700 " + size.toFixed(1) + 'px "Playfair Display", Georgia, "Times New Roman", serif';
    octx.textAlign = "center";
    octx.textBaseline = "middle";
    octx.fillStyle = "#fff";
    octx.fillText(text, w / 2, h * 0.52);

    var step = w > 900 ? 4 : 3;
    var img, data, pts = [];
    try {
      img = octx.getImageData(0, 0, w, h);
      data = img.data;
    } catch (e) {
      return;
    }

    for (var y = 0; y < h; y += step) {
      for (var x = 0; x < w; x += step) {
        var idx = (y * w + x) * 4 + 3;
        if (data[idx] > 128) {
          pts.push([x + rand(-0.9, 0.9), y + rand(-0.9, 0.9)]);
        }
      }
    }
    if (!pts.length) return;

    var MAX = w < 640 ? 900 : 1750;
    if (pts.length > MAX) {
      for (var i = pts.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = pts[i];
        pts[i] = pts[j];
        pts[j] = tmp;
      }
      pts.length = MAX;
    }

    if (fresh || !particles.length) {
      particles = [];
      for (var k = 0; k < pts.length; k++) {
        var p = pts[k];
        var seed = Math.random();
        var hue =
          seed < 0.1 ? 45 : seed < 0.55 ? 288 + (p[0] / w) * 46 : 330 + (p[0] / w) * 34;
        particles.push({
          x: rand(-w * 0.2, w * 1.2),
          y: rand(-h * 0.6, h * 1.4),
          tx: p[0],
          ty: p[1],
          vx: 0,
          vy: 0,
          size: rand(0.8, 1.9),
          hue: hue,
          light: rand(62, 88),
          sat: rand(72, 100),
          phase: rand(0, TAU),
          tw: rand(0.4, 1.6),
          spark: Math.random() < 0.05,
        });
      }
    } else {
      /* re-target: keep positions so the name flows into its new shape */
      var n = Math.min(pts.length, particles.length);
      for (var m = 0; m < n; m++) {
        particles[m].tx = pts[m][0];
        particles[m].ty = pts[m][1];
      }
      for (var q = n; q < pts.length; q++) {
        var s = pts[q];
        particles.push({
          x: rand(0, w),
          y: rand(0, h),
          tx: s[0],
          ty: s[1],
          vx: 0,
          vy: 0,
          size: rand(0.8, 1.8),
          hue: 300 + (s[0] / w) * 55,
          light: rand(64, 86),
          sat: rand(75, 100),
          phase: rand(0, TAU),
          tw: rand(0.4, 1.6),
          spark: false,
        });
      }
      if (particles.length > pts.length) particles.length = pts.length;
    }
    wake();
  }

  function draw(dt) {
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = "lighter";

    var stiffness = 118,
      damping = 7.2;

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var wobX = Math.sin(elapsed * 0.9 + p.phase) * 0.9;
      var wobY = Math.cos(elapsed * 1.1 + p.phase * 1.3) * 0.9;
      var tx = p.tx + wobX;
      var ty = p.ty + wobY;

      p.vx += (tx - p.x) * stiffness * dt;
      p.vy += (ty - p.y) * stiffness * dt;

      if (mouse.active) {
        var dx = p.x - mouse.x;
        var dy = p.y - mouse.y;
        var d2 = dx * dx + dy * dy;
        if (d2 < 12000 && d2 > 0.01) {
          var d = Math.sqrt(d2);
          var force = (1 - d / 110) * 2600;
          p.vx += (dx / d) * force * dt;
          p.vy += (dy / d) * force * dt;
        }
      }

      var damp = Math.exp(-damping * dt);
      p.vx *= damp;
      p.vy *= damp;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      var tw = 0.7 + 0.3 * Math.sin(elapsed * (1.2 + p.tw) + p.phase);
      var alpha = started ? 0.92 : 0;

      ctx.globalAlpha = alpha * tw;
      ctx.fillStyle = "hsl(" + p.hue + "," + p.sat + "%," + p.light + "%)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, TAU);
      ctx.fill();

      ctx.globalAlpha = alpha * 0.13 * tw;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (p.spark ? 5.2 : 3.4), 0, TAU);
      ctx.fill();

      if (p.spark) {
        ctx.globalAlpha = alpha * 0.5 * tw;
        ctx.fillStyle = "rgba(255,240,200,0.9)";
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.7, 0, TAU);
        ctx.fill();
      }
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  function frame(now) {
    if (!running) return;
    if (!last) last = now;
    var dt = Math.min(0.04, (now - last) / 1000);
    last = now;
    elapsed += dt;
    draw(dt);
    raf = requestAnimationFrame(frame);
  }

  function wake() {
    if (running || !visible) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  function play() {
    started = true;
    wake();
  }

  function setName(newName) {
    name = newName;
    build(false);
    if (started) wake();
  }

  /* ---------------- events ---------------- */
  canvas.addEventListener("pointermove", function (e) {
    var r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
    mouse.active = true;
  });
  canvas.addEventListener("pointerleave", function () {
    mouse.active = false;
    mouse.x = -9999;
    mouse.y = -9999;
  });

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) wake();
        else stop();
      },
      { threshold: 0.01 }
    );
    io.observe(canvas);
  }

  var rt = null;
  window.addEventListener(
    "resize",
    function () {
      clearTimeout(rt);
      rt = setTimeout(resize, 180);
    },
    { passive: true }
  );

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      build(false);
    });
  }

  /* first paint */
  resize();
  setTimeout(function () {
    build(true);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { build(false); });
  }, 60);

  return { play: play, setName: setName, resize: resize, build: build };
})();