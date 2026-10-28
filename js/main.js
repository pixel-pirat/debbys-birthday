/* ============================================================
   MAIN — the conductor
   ============================================================ */
(function () {
  "use strict";

  var $ = function (s, r) {
    return (r || document).querySelector(s);
  };
  var $$ = function (s, r) {
    return Array.prototype.slice.call((r || document).querySelectorAll(s));
  };

  var body = document.body;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var entered = false;
  var blowComplete = false;
  var letterOpened = false;
  var letterTyping = null;
  var finalePlayed = false;
  var toastTimer = null;

  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

  /* ---------------------------------------------------------- utils */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function toast(msg) {
    var el = $("#toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove("show");
    }, 3200);
  }

  /* ---------------------------------------------------------- build content */
  function buildWishes() {
    var grid = $("#wishGrid");
    grid.innerHTML = BDAY.wishes
      .map(function (w, i) {
        return (
          '<button class="wish-card reveal" type="button" aria-pressed="false">' +
            '<span class="wish-inner">' +
              '<span class="wish-face wish-front">' +
                '<span class="wish-front-top">' +
                  '<span class="wish-index">' + String(i + 1).padStart(2, "0") + " / " + String(BDAY.wishes.length).padStart(2, "0") + "</span>" +
                  '<span class="wish-icon" aria-hidden="true">' + esc(w.icon) + "</span>" +
                "</span>" +
                '<span class="wish-hint">' + esc(BDAY.fill(w.front)) +
                  "<small>open the wish ✦</small>" +
                "</span>" +
              "</span>" +
              '<span class="wish-face wish-back">' +
                '<span class="wish-text">' + esc(BDAY.fill(w.back)) + "</span>" +
                '<span class="wish-tag">' + esc(w.tag) + "</span>" +
              "</span>" +
            "</span>" +
          "</button>"
        );
      })
      .join("");

    $$(".wish-card", grid).forEach(function (card, i) {
      card.style.transitionDelay = (i % 3) * 80 + "ms";
      card.addEventListener("click", function () {
        var on = card.classList.toggle("flipped");
        card.setAttribute("aria-pressed", on ? "true" : "false");
        BdayAudio.pop();
        var r = card.getBoundingClientRect();
        FX.sparkleAt(r.left + r.width / 2, r.top + r.height / 2, on ? 10 : 4);
      });
    });
  }

  function buildMemories() {
    var row = $("#polaroidRow");
    row.innerHTML = BDAY.memories
      .map(function (m) {
        var photo = m.src
          ? '<img src="' + esc(m.src) + '" alt="' + esc(m.caption) + '" loading="lazy" />'
          : '<span class="emoji" aria-hidden="true">' + esc(m.emoji) + "</span>";
        return (
          '<div class="polaroid-wrap reveal">' +
            '<figure class="polaroid">' +
              '<span class="tape" aria-hidden="true"></span>' +
              '<div class="photo" style="--h:' + Number(m.hue || 280) + '">' + photo + "</div>" +
              '<figcaption class="caption">' + esc(m.caption) + "</figcaption>" +
            "</figure>" +
          "</div>"
        );
      })
      .join("");

    $$(".polaroid-wrap", row).forEach(function (w, i) {
      w.style.transitionDelay = i * 90 + "ms";
    });
    $$(".polaroid", row).forEach(function (p) {
      p.style.cursor = "pointer";
      p.addEventListener("click", function () {
        var r = p.getBoundingClientRect();
        FX.sparkleAt(r.left + r.width / 2, r.top + r.height / 2, 12);
        BdayAudio.sparkle();
      });
    });
  }

  /* ---------------------------------------------------------- your own photos & music */
  function refreshPhotoThumb(i) {
    var m = BDAY.memories[i];
    var thumb = $("#pThumb" + i);
    if (!thumb) return;
    thumb.innerHTML = m.src ? '<img src="' + esc(m.src) + '" alt="" />' : "<span>" + esc(m.emoji) + "</span>";
  }

  function applyPhoto(i, file) {
    var slot = "memory-" + i;
    var previous = BDAY.memories[i].src;
    var previewUrl = URL.createObjectURL(file);
    BDAY.memories[i].src = previewUrl;
    buildMemories();
    refreshPhotoThumb(i);
    var clearBtn = $('[data-clear-photo="' + i + '"]');
    if (clearBtn) clearBtn.hidden = false;

    toast("Uploading…");
    BdayMedia.upload(slot, file)
      .then(function (d) {
        BDAY.memories[i].src = d.url;
        buildMemories();
        refreshPhotoThumb(i);
        toast("Photo saved — everyone who opens this page will see it ✦");
      })
      .catch(function (e) {
        BDAY.memories[i].src = previous;
        buildMemories();
        refreshPhotoThumb(i);
        if (clearBtn) clearBtn.hidden = !previous;
        toast(e && e.message ? e.message : "Couldn't save that photo.");
      });
  }

  function clearPhoto(i) {
    var slot = "memory-" + i;
    var previous = BDAY.memories[i].src;
    BDAY.memories[i].src = null;
    buildMemories();
    refreshPhotoThumb(i);
    var clearBtn = $('[data-clear-photo="' + i + '"]');
    if (clearBtn) clearBtn.hidden = true;

    BdayMedia.remove(slot).catch(function (e) {
      BDAY.memories[i].src = previous;
      buildMemories();
      refreshPhotoThumb(i);
      if (clearBtn) clearBtn.hidden = false;
      toast(e && e.message ? e.message : "Couldn't remove that photo.");
    });
  }

  function buildPhotoUploads() {
    var wrap = $("#fPhotos");
    if (!wrap) return;
    wrap.innerHTML = BDAY.memories
      .map(function (m, i) {
        return (
          '<div class="photo-row">' +
            '<div class="photo-thumb" id="pThumb' + i + '" style="--h:' + Number(m.hue || 280) + '">' +
              (m.src ? '<img src="' + esc(m.src) + '" alt="" />' : "<span>" + esc(m.emoji) + "</span>") +
            "</div>" +
            '<div class="photo-row-body">' +
              '<span class="photo-row-caption">' + esc(m.caption) + "</span>" +
              '<div class="photo-row-actions">' +
                '<label class="upload-btn sm" for="fPhoto' + i + '">' +
                  '<input id="fPhoto' + i + '" type="file" accept="image/*" hidden data-i="' + i + '" />' +
                  "<span>Upload</span>" +
                "</label>" +
                '<button class="link-btn sm" type="button" data-clear-photo="' + i + '"' + (m.src ? "" : " hidden") + ">✕ remove</button>" +
              "</div>" +
            "</div>" +
          "</div>"
        );
      })
      .join("");

    $$("input[type=file][data-i]", wrap).forEach(function (input) {
      input.addEventListener("change", function () {
        var i = Number(input.dataset.i);
        var file = input.files && input.files[0];
        if (file) applyPhoto(i, file);
      });
    });
    $$("[data-clear-photo]", wrap).forEach(function (btn) {
      btn.addEventListener("click", function () {
        clearPhoto(Number(btn.dataset.clearPhoto));
      });
    });
  }

  var fMusic = $("#fMusic");
  var fMusicLabel = $("#fMusicLabel");
  var fMusicClear = $("#fMusicClear");

  function applyMusic(file) {
    var previewUrl = URL.createObjectURL(file);
    BdayAudio.setCustomTrack(previewUrl);
    if (fMusicLabel) fMusicLabel.textContent = file.name || "your song";
    if (fMusicClear) fMusicClear.hidden = false;

    toast("Uploading…");
    BdayMedia.upload("music", file)
      .then(function (d) {
        BdayAudio.setCustomTrack(d.url);
        toast("Your song is saved — everyone who opens this page will hear it ✦");
      })
      .catch(function (e) {
        BdayAudio.clearCustomTrack();
        if (fMusicLabel) fMusicLabel.textContent = "Choose an audio file…";
        if (fMusicClear) fMusicClear.hidden = true;
        toast(e && e.message ? e.message : "Couldn't save that song.");
      });
  }

  function clearMusicFile() {
    BdayAudio.clearCustomTrack();
    if (fMusicLabel) fMusicLabel.textContent = "Choose an audio file…";
    if (fMusicClear) fMusicClear.hidden = true;
    BdayMedia.remove("music").catch(function (e) {
      toast(e && e.message ? e.message : "Couldn't remove that song.");
    });
  }

  if (fMusic) {
    fMusic.addEventListener("change", function () {
      var file = fMusic.files && fMusic.files[0];
      if (file) applyMusic(file);
    });
  }
  if (fMusicClear) fMusicClear.addEventListener("click", clearMusicFile);

  /* applies whatever the server already has for music, once it's loaded */
  function applyServerMusic(media) {
    var mm = media && media.music;
    if (!mm) return;
    BdayAudio.setCustomTrack(mm.url);
    if (fMusicLabel) fMusicLabel.textContent = mm.filename || "your song";
    if (fMusicClear) fMusicClear.hidden = false;
  }

  /* ---------------------------------------------------------- admin passphrase */
  var fToken = $("#fToken");
  if (fToken) {
    fToken.value = BDAY.getToken();
    fToken.addEventListener("change", function () {
      BDAY.setToken(fToken.value.trim());
    });
  }

  function paint() {
    var p = BDAY.resolved();
    document.title = "Happy Birthday, " + p.name + " ✦";
    ["#gateName", "#navName", "#srName", "#cakeName", "#finaleName", "#coverName"].forEach(function (sel) {
      var el = $(sel);
      if (el) el.textContent = p.name;
    });
    var sub = $("#finaleSub");
    if (sub) sub.textContent = p.sub;
    var sign = $("#letterSign");
    if (sign) sign.textContent = p.sign;
    var date = $("#letterDate");
    if (date) {
      var d = new Date();
      date.textContent = "for " + p.name + " · " + d.toLocaleDateString(undefined, { month: "long", day: "numeric" });
    }
    if (!letterOpened) {
      var lb = $("#letterBody");
      if (lb) lb.textContent = p.letter;
    }
    NameFX.setName(p.name);
  }

  /* ---------------------------------------------------------- gate */
  var gate = $("#gate");
  var gateBtn = $("#enterBtn");
  var musicBtn = $("#musicBtn");

  function enter() {
    if (entered) return;
    entered = true;
    window.scrollTo(0, 0);
    gate.classList.add("done");
    body.classList.remove("is-locked");
    body.classList.add("ready");

    var audioOk = BdayAudio.start();
    if (!audioOk) {
      musicBtn.setAttribute("aria-pressed", "false");
    }

    setTimeout(function () {
      NameFX.play();
    }, 220);

    setTimeout(function () {
      FX.bigMoment();
      BdayAudio.sparkle();
    }, 2150);

    setTimeout(function () {
      FX.confetti(70);
      BdayAudio.pop();
    }, 2650);
  }

  gateBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    enter();
  });
  gate.addEventListener("click", enter);

  document.addEventListener("keydown", function (e) {
    if (!entered && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      enter();
    }
  });

  /* ---------------------------------------------------------- music toggle */
  function toggleMusic() {
    var on = !BdayAudio.isMusicOn();
    BdayAudio.setMusic(on);
    musicBtn.setAttribute("aria-pressed", on ? "true" : "false");
    var label = $(".chip-label", musicBtn);
    if (label) label.textContent = on ? "Music" : "Muted";
    if (on) BdayAudio.sparkle();
  }
  musicBtn.addEventListener("click", function () {
    if (!entered) {
      enter();
      return;
    }
    toggleMusic();
  });

  $("#fireBtn").addEventListener("click", function () {
    if (!entered) {
      enter();
      return;
    }
    FX.bigMoment();
    FX.celebrate(2600);
    BdayAudio.tada();
  });

  /* ---------------------------------------------------------- cake */
  var cakeEl = $("#cakeEl");
  var blowBtn = $("#blowBtn");
  var micBtn = $("#micBtn");
  var wishStatus = $("#wishStatus");

  function extinguish(el) {
    if (!el || el.classList.contains("out")) return;
    el.classList.add("out");
    var smoke = document.createElement("span");
    smoke.className = "smoke";
    smoke.style.setProperty("--sx", (Math.random() * 34 - 17).toFixed(0) + "px");
    el.appendChild(smoke);
    setTimeout(function () {
      smoke.remove();
    }, 3000);
  }

  function completeBlow() {
    if (blowComplete) return;
    blowComplete = true;
    cakeEl.classList.add("out");
    $$(".candle").forEach(extinguish);
    wishStatus.textContent = "Wish received. The universe is already working on it. ✦";
    wishStatus.classList.add("show");
    blowBtn.textContent = "Wish sealed ✓";
    blowBtn.disabled = true;
    blowBtn.style.opacity = "0.65";
    blowBtn.style.cursor = "default";
    BdayAudio.blow();
    setTimeout(function () {
      FX.confetti(60, { y: -20 });
      BdayAudio.pop();
    }, 120);
    setTimeout(function () {
      BdayAudio.boom(1);
      FX.burst(window.innerWidth * 0.28, window.innerHeight * 0.32, { type: "heart", power: 1.2, hue: 340 });
    }, 420);
    setTimeout(function () {
      FX.burst(window.innerWidth * 0.72, window.innerHeight * 0.28, { type: "peony", power: 1.15, hue: 275 });
    }, 620);
    setTimeout(function () {
      FX.burst(window.innerWidth * 0.5, window.innerHeight * 0.2, { type: "star", power: 1.3, hue: 45 });
      BdayAudio.tada();
    }, 900);
  }

  function blowAll() {
    if (blowComplete) return;
    var candles = $$(".candle");
    BdayAudio.blow();
    candles.forEach(function (el, i) {
      setTimeout(function () {
        extinguish(el);
      }, i * 130);
    });
    setTimeout(completeBlow, candles.length * 130 + 220);
  }

  $$(".candle").forEach(function (el) {
    el.addEventListener("click", function () {
      BdayAudio.pop();
      extinguish(el);
      if ($$(".candle").every(function (c) { return c.classList.contains("out"); })) {
        setTimeout(completeBlow, 250);
      }
    });
  });

  blowBtn.addEventListener("click", blowAll);

  /* mic */
  var micStream = null,
    micRAF = null,
    micCtx = null;

  function stopMic() {
    if (micRAF) cancelAnimationFrame(micRAF);
    micRAF = null;
    if (micStream) {
      micStream.getTracks().forEach(function (t) { t.stop(); });
      micStream = null;
    }
    if (micCtx) {
      try { micCtx.close(); } catch (e) {}
      micCtx = null;
    }
    micBtn.classList.remove("listening");
    micBtn.innerHTML = '<span class="mic-dot"></span> use my real breath';
  }

  micBtn.addEventListener("click", function () {
    if (blowComplete) return;
    if (micStream) {
      stopMic();
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast("This browser can't listen in — tap the candles instead ✦");
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then(function (stream) {
        micStream = stream;
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) throw new Error("no audio context");
        micCtx = new AC();
        var src = micCtx.createMediaStreamSource(stream);
        var an = micCtx.createAnalyser();
        an.fftSize = 1024;
        src.connect(an);
        var buf = new Float32Array(an.fftSize);
        var loud = 0;
        var deadline = performance.now() + 15000;

        micBtn.classList.add("listening");
        micBtn.innerHTML = '<span class="mic-dot"></span> listening… blow!';

        (function tick() {
          if (!micStream) return;
          an.getFloatTimeDomainData(buf);
          var sum = 0;
          for (var i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
          var rms = Math.sqrt(sum / buf.length);
          if (rms > 0.06) loud++;
          else loud = Math.max(0, loud - 1);

          if (loud > 3) {
            stopMic();
            blowAll();
            return;
          }
          if (performance.now() > deadline) {
            stopMic();
            toast("Couldn't hear you — tap the candles instead ✦");
            return;
          }
          micRAF = requestAnimationFrame(tick);
        })();
      })
      .catch(function () {
        stopMic();
        toast("No microphone access — tap the candles instead ✦");
      });
  });

  /* ---------------------------------------------------------- letter */
  var sealWrap = $("#sealWrap");
  var sealBtn = $("#sealBtn");
  var letterCard = $("#letterCard");

  function completeTyping() {
    if (!letterTyping) return;
    clearInterval(letterTyping);
    letterTyping = null;
    $("#letterBody").textContent = BDAY.resolved().letter;
  }

  function typeLetter() {
    var el = $("#letterBody");
    var full = BDAY.resolved().letter;
    if (reduceMotion) {
      el.textContent = full;
      return;
    }
    /* reserve the finished height up-front so the paper doesn't jump while writing */
    el.style.minHeight = "";
    el.textContent = full;
    var finalHeight = el.offsetHeight;
    el.style.minHeight = finalHeight + "px";
    el.textContent = "";
    var caret = document.createElement("span");
    caret.className = "cursor";
    el.appendChild(caret);

    var i = 0;
    var step = 3;
    letterTyping = setInterval(function () {
      if (i >= full.length) {
        completeTyping();
        return;
      }
      var next = Math.min(full.length, i + step);
      el.insertBefore(document.createTextNode(full.slice(i, next)), caret);
      i = next;
      if (Math.random() < 0.05) BdayAudio.pop();
    }, 15);
  }

  function openLetter() {
    if (letterOpened) return;
    letterOpened = true;
    sealWrap.classList.add("unsealed");
    BdayAudio.sparkle();
    var r = sealWrap.getBoundingClientRect();
    FX.confetti(48, { x: r.left + r.width / 2, y: r.top + 40, vy: 210 });
    setTimeout(typeLetter, 650);
  }

  sealBtn.addEventListener("click", openLetter);
  letterCard.addEventListener("click", function () {
    if (letterTyping) completeTyping();
  });

  /* ---------------------------------------------------------- sheet */
  var sheet = $("#sheet");
  var scrim = $("#sheetScrim");
  var personalizeBtn = $("#personalizeBtn");
  var sheetOpen = false;

  function openSheet() {
    if (sheetOpen) return;
    sheetOpen = true;
    $("#fName").value = BDAY.state.name;
    $("#fLetter").value = BDAY.state.letter;
    $("#fSign").value = BDAY.state.sign;
    $("#fSub").value = BDAY.state.sub;
    scrim.hidden = false;
    requestAnimationFrame(function () {
      scrim.classList.add("show");
    });
    sheet.classList.add("open");
    sheet.setAttribute("aria-hidden", "false");
    body.classList.add("sheet-open");
    setTimeout(function () {
      $("#fName").focus();
      $("#fName").select();
    }, 320);
  }

  function closeSheet() {
    if (!sheetOpen) return;
    sheetOpen = false;
    sheet.classList.remove("open");
    sheet.setAttribute("aria-hidden", "true");
    scrim.classList.remove("show");
    body.classList.remove("sheet-open");
    setTimeout(function () {
      scrim.hidden = true;
    }, 520);
    personalizeBtn.focus();
  }

  personalizeBtn.addEventListener("click", function () {
    if (!entered) return;
    openSheet();
  });
  $("#sheetClose").addEventListener("click", closeSheet);
  scrim.addEventListener("click", closeSheet);

  var saveBtn = $("#saveBtn");
  saveBtn.addEventListener("click", function () {
    var name = $("#fName").value.trim().slice(0, 22) || BDAY.DEFAULTS.name;
    var letter = $("#fLetter").value.trim() || BDAY.DEFAULTS.letter;
    var sign = $("#fSign").value.trim() || BDAY.DEFAULTS.sign;
    var sub = $("#fSub").value.trim() || BDAY.DEFAULTS.sub;

    saveBtn.disabled = true;
    saveBtn.textContent = "Saving…";
    BDAY.save({ name: name, letter: letter, sign: sign, sub: sub })
      .then(function () {
        paint();
        if (letterOpened) {
          if (letterTyping) completeTyping();
          var lb = $("#letterBody");
          lb.style.minHeight = "";
          lb.textContent = BDAY.resolved().letter;
        }
        closeSheet();
        toast("Saved — everyone who opens this page sees it now ✦");
        BdayAudio.sparkle();
        if (entered) {
          FX.celebrate(1800);
          setTimeout(function () {
            FX.burst(window.innerWidth / 2, window.innerHeight * 0.3, { type: "heart", hue: 340, power: 1.2 });
          }, 350);
        }
      })
      .catch(function (e) {
        toast(e && e.message ? e.message : "Couldn't save. Check the passphrase above.");
      })
      .finally(function () {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save & celebrate";
      });
  });

  $("#resetBtn").addEventListener("click", function () {
    BDAY.reset();
    $("#fName").value = BDAY.DEFAULTS.name;
    $("#fLetter").value = BDAY.DEFAULTS.letter;
    $("#fSign").value = BDAY.DEFAULTS.sign;
    $("#fSub").value = BDAY.DEFAULTS.sub;
    toast("Back to the defaults — press save to apply");
  });

  $("#shareBtn").addEventListener("click", function () {
    var name = $("#fName").value.trim().slice(0, 22) || BDAY.state.name;
    var base = location.href.split("?")[0].split("#")[0];
    var url = base + "?name=" + encodeURIComponent(name);

    function done() {
      toast("Link copied — send it to " + name + " ✦");
      BdayAudio.sparkle();
    }
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = url;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        done();
      } catch (e) {
        toast("Couldn't copy — the link is " + url);
      }
      ta.remove();
    }

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(done, fallback);
    } else {
      fallback();
    }
  });

  /* ---------------------------------------------------------- reveal */
  function observeReveals() {
    var items = $$(".reveal");
    if (!("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    items.forEach(function (el) { io.observe(el); });
  }

  /* ---------------------------------------------------------- finale */
  var balloons = $("#balloons");
  function buildBalloons() {
    var hues = [340, 275, 45, 190, 320, 160, 12];
    var frag = document.createDocumentFragment();
    for (var i = 0; i < 8; i++) {
      var b = document.createElement("span");
      b.className = "balloon";
      var wd = 54 + Math.random() * 46;
      b.style.setProperty("--w", wd.toFixed(0) + "px");
      b.style.setProperty("--h", hues[i % hues.length]);
      b.style.left = (4 + Math.random() * 90).toFixed(1) + "%";
      b.style.setProperty("--dur", (20 + Math.random() * 16).toFixed(1) + "s");
      b.style.setProperty("--delay", (-Math.random() * 20).toFixed(1) + "s");
      b.style.setProperty("--sway", (30 + Math.random() * 70).toFixed(0) + "px");
      frag.appendChild(b);
    }
    balloons.appendChild(frag);
  }

  function watchFinale() {
    var sec = $("#finale");
    if (!("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting && entry.intersectionRatio > 0.35 && !finalePlayed) {
            finalePlayed = true;
            FX.celebrate(6500);
            BdayAudio.tada();
            setTimeout(function () {
              FX.burst(window.innerWidth * 0.5, window.innerHeight * 0.24, { type: "heart", power: 1.35, hue: 340 });
            }, 500);
          }
        });
      },
      { threshold: [0.35] }
    );
    io.observe(sec);
  }

  $("#againBtn").addEventListener("click", function () {
    FX.celebrate(6000);
    FX.bigMoment();
    BdayAudio.tada();
  });

  $("#replayBtn").addEventListener("click", function () {
    window.scrollTo(0, 0);
    location.reload();
  });

  /* ---------------------------------------------------------- scroll + cursor */
  var progressBar = $("#progressBar");
  var cursorGlow = $("#cursorGlow");
  var pointer = { x: window.innerWidth / 2, y: window.innerHeight / 3 };
  var glowPos = { x: pointer.x, y: pointer.y };
  var glowRaf = null;

  function onScroll() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var pct = max > 0 ? (window.scrollY / max) * 100 : 0;
    progressBar.style.width = Math.min(100, Math.max(0, pct)) + "%";
  }
  window.addEventListener("scroll", onScroll, { passive: true });

  function glowLoop() {
    glowPos.x += (pointer.x - glowPos.x) * 0.12;
    glowPos.y += (pointer.y - glowPos.y) * 0.12;
    cursorGlow.style.transform = "translate3d(" + glowPos.x + "px," + glowPos.y + "px,0)";
    glowRaf = requestAnimationFrame(glowLoop);
  }

  if (window.matchMedia("(hover:hover)").matches) {
    window.addEventListener(
      "pointermove",
      function (e) {
        pointer.x = e.clientX;
        pointer.y = e.clientY;
        if (entered && Math.random() < 0.22) FX.sparkleAt(e.clientX, e.clientY, 1);
      },
      { passive: true }
    );
    glowLoop();
  }

  /* click anywhere → a rocket */
  document.addEventListener("click", function (e) {
    if (!entered) return;
    if (e.target.closest("button, a, input, textarea, label, .sheet, .nav, .letter-seal-wrap")) return;
    FX.launch(e.clientX, e.clientY, {});
    FX.sparkleAt(e.clientX, e.clientY, 4);
  });

  /* ---------------------------------------------------------- keys */
  document.addEventListener("keydown", function (e) {
    var tag = (document.activeElement && document.activeElement.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA") {
      if (e.key === "Escape") closeSheet();
      return;
    }
    var k = e.key.toLowerCase();
    if (k === "f") {
      FX.bigMoment();
      FX.celebrate(3000);
      BdayAudio.tada();
    } else if (k === "m") {
      toggleMusic();
    } else if (k === "p") {
      e.preventDefault();
      if (!entered) return;
      sheetOpen ? closeSheet() : openSheet();
    } else if (e.key === "Escape") {
      closeSheet();
    }
  });

  if (document.documentElement.scrollHeight <= window.innerHeight) {
    document.documentElement.style.overflowY = "auto";
  }

  /* ---------------------------------------------------------- init */
  buildWishes();
  buildMemories();
  buildPhotoUploads();
  buildBalloons();
  paint();
  observeReveals();
  watchFinale();
  onScroll();

  /* The real, shared content (name/letter/photos/song) lives on the
     server — this is what makes it show the same way for everyone who
     opens the link, not just whoever set it up. Paints again once it's
     in, on top of the defaults already showing. */
  BDAY.loadFromServer().then(function (data) {
    if (!data) return;
    paint();
    buildMemories();
    buildPhotoUploads();
    applyServerMusic(data.media);
  });

  var y = $("#footYear");
  if (y) y.textContent = new Date().getFullYear();

  window.addEventListener("load", function () {
    NameFX.resize();
    onScroll();
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) BdayAudio.suspend();
    else if (entered) BdayAudio.resume();
  });

  /* gentle autopilot sparkles after entering the wishes section */
  var wishSection = $("#wishes");
  if (wishSection && "IntersectionObserver" in window) {
    var wishSeen = false;
    var wio = new IntersectionObserver(
      function (entries) {
        if (entries[0].isIntersecting && !wishSeen) {
          wishSeen = true;
          BdayAudio.sparkle();
          FX.launch(window.innerWidth * 0.5, window.innerHeight * 0.34, { type: "crackle" });
        }
      },
      { threshold: 0.3 }
    );
    wio.observe(wishSection);
  }
})();
