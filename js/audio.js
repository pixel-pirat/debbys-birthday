/* ============================================================
   AUDIO — everything is synthesised. No audio files, no CDN.
   A music-box "Happy Birthday" + firework sound design.
   ============================================================ */
window.BdayAudio = (function () {
  "use strict";

  var ctx = null,
    master = null,
    musicBus = null,
    sfxBus = null,
    reverb = null,
    ready = false,
    musicWanted = true,
    loopTimer = null,
    loopToken = 0,
    noiseBuf = null,
    lastWhoosh = 0,
    started = false,
    customEl = null,
    customSrcNode = null;

  var NOTES = {
    G3: 196.0, C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
    C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0,
  };

  /* Happy Birthday, 3/4, as [note, beats] */
  var MELODY = [
    ["G4", 0.75], ["G4", 0.25], ["A4", 1], ["G4", 1], ["C5", 1], ["B4", 2],
    ["G4", 0.75], ["G4", 0.25], ["A4", 1], ["G4", 1], ["D5", 1], ["C5", 2],
    ["G4", 0.75], ["G4", 0.25], ["G5", 1], ["E5", 1], ["C5", 1], ["B4", 1], ["A4", 2],
    ["F5", 0.75], ["F5", 0.25], ["E5", 1], ["C5", 1], ["D5", 1], ["C5", 2],
  ];
  var BEAT = 0.46;

  function init() {
    if (ctx) return ctx;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;

    try {
      ctx = new AC();
    } catch (e) {
      return null;
    }

    master = ctx.createGain();
    master.gain.value = 0.0001;
    master.connect(ctx.destination);

    reverb = ctx.createConvolver();
    reverb.buffer = makeImpulse(2.6, 2.8);
    var wet = ctx.createGain();
    wet.gain.value = 0.34;
    reverb.connect(wet);
    wet.connect(master);

    musicBus = ctx.createGain();
    musicBus.gain.value = 0.0001;
    musicBus.connect(master);
    musicBus.connect(reverb);

    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.55;
    sfxBus.connect(master);
    sfxBus.connect(reverb);

    noiseBuf = makeNoise(1.4);
    ready = true;
    return ctx;
  }

  function makeNoise(seconds) {
    var len = Math.floor(ctx.sampleRate * seconds);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function makeImpulse(seconds, decay) {
    var len = Math.floor(ctx.sampleRate * seconds);
    var buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var c = 0; c < 2; c++) {
      var d = buf.getChannelData(c);
      for (var i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  function start() {
    if (!init()) return false;
    if (ctx.state === "suspended") ctx.resume();
    started = true;
    var t = ctx.currentTime;
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), t);
    master.gain.exponentialRampToValueAtTime(0.9, t + 2.2);
    if (musicWanted) {
      if (customEl) playCustom();
      else startMusic();
    }
    return true;
  }

  function bell(freq, at, dur, level) {
    if (!ready) return;
    var t = Math.max(at, ctx.currentTime);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(level, 0.0002), t + 0.014);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(musicBus);

    var o1 = ctx.createOscillator();
    o1.type = "sine";
    o1.frequency.setValueAtTime(freq, t);

    var o2 = ctx.createOscillator();
    o2.type = "triangle";
    o2.frequency.setValueAtTime(freq * 2.005, t);

    var g2 = ctx.createGain();
    g2.gain.value = 0.16;

    var o3 = ctx.createOscillator();
    o3.type = "sine";
    o3.frequency.setValueAtTime(freq * 3.01, t);
    var g3 = ctx.createGain();
    g3.gain.value = 0.05;

    o1.connect(g);
    o2.connect(g2);
    g2.connect(g);
    o3.connect(g3);
    g3.connect(g);

    o1.start(t);
    o2.start(t);
    o3.start(t);
    var end = t + dur + 0.06;
    o1.stop(end);
    o2.stop(end);
    o3.stop(end);
  }

  function startMusic() {
    if (!ready || !musicWanted) return;
    loopToken++;
    var token = loopToken;
    musicBus.gain.cancelScheduledValues(ctx.currentTime);
    musicBus.gain.setValueAtTime(Math.max(musicBus.gain.value, 0.0001), ctx.currentTime);
    musicBus.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 1.4);
    scheduleLoop(ctx.currentTime + 0.35, token);
  }

  function scheduleLoop(startAt, token) {
    if (!ready || token !== loopToken || !musicWanted) return;
    var t = startAt;
    for (var i = 0; i < MELODY.length; i++) {
      var n = MELODY[i];
      var freq = NOTES[n[0]] || 440;
      var beats = n[1];
      var dur = Math.max(0.5, beats * BEAT * 2.1);
      bell(freq, t, dur, i === 0 ? 0.15 : 0.19);
      /* a whisper of an octave sparkle on longer notes */
      if (beats >= 2) bell(freq * 2, t + 0.02, dur * 0.7, 0.035);
      t += beats * BEAT;
    }
    var total = t - startAt;
    clearTimeout(loopTimer);
    loopTimer = setTimeout(function () {
      scheduleLoop(startAt + total, token);
    }, Math.max(400, (total - 0.25) * 1000));
  }

  function stopMusic() {
    if (!ready) return;
    loopToken++;
    clearTimeout(loopTimer);
    musicBus.gain.cancelScheduledValues(ctx.currentTime);
    musicBus.gain.setValueAtTime(Math.max(musicBus.gain.value, 0.0001), ctx.currentTime);
    musicBus.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
  }

  function setMusic(on) {
    musicWanted = !!on;
    if (!ready) return;
    if (musicWanted) {
      if (customEl) playCustom();
      else startMusic();
    } else if (customEl) {
      pauseCustom();
    } else {
      stopMusic();
    }
  }

  function isMusicOn() {
    return musicWanted;
  }

  /* ---------------- a user-uploaded track, in place of the music box ---------------- */

  function playCustom() {
    if (!customEl) return;
    var t = ctx.currentTime;
    musicBus.gain.cancelScheduledValues(t);
    musicBus.gain.setValueAtTime(Math.max(musicBus.gain.value, 0.0001), t);
    musicBus.gain.exponentialRampToValueAtTime(0.5, t + 1.4);
    var p = customEl.play();
    if (p && p.catch) p.catch(function () {});
  }

  function pauseCustom() {
    if (!customEl) return;
    var t = ctx.currentTime;
    musicBus.gain.cancelScheduledValues(t);
    musicBus.gain.setValueAtTime(Math.max(musicBus.gain.value, 0.0001), t);
    musicBus.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    var el = customEl;
    setTimeout(function () {
      if (el) el.pause();
    }, 520);
  }

  /* url: an audio file URL (a same-origin blob: URL, or a cross-origin
     one like Vercel Blob's — crossOrigin is set so createMediaElementSource
     doesn't taint the graph either way). Swaps it in for the synthesised
     melody; loops; routed through the same music bus (reverb, mute,
     fades) as everything else. */
  function setCustomTrack(url) {
    if (!init()) return false;
    stopMusic();
    if (customEl) {
      try {
        customEl.pause();
      } catch (e) {}
    }
    customEl = new Audio();
    customEl.loop = true;
    customEl.preload = "auto";
    customEl.crossOrigin = "anonymous";
    customEl.src = url;
    try {
      customSrcNode = ctx.createMediaElementSource(customEl);
      customSrcNode.connect(musicBus);
    } catch (e) {
      /* some browsers refuse a second graph on reuse — a fresh <audio> each call avoids this */
    }
    if (started && musicWanted) playCustom();
    return true;
  }

  function clearCustomTrack() {
    if (customEl) {
      try {
        customEl.pause();
      } catch (e) {}
      customEl.src = "";
    }
    customEl = null;
    customSrcNode = null;
    if (started && musicWanted) startMusic();
  }

  function hasCustomTrack() {
    return !!customEl;
  }

  /* ---------------- sound design ---------------- */

  function boom(power) {
    if (!ready) return;
    power = power == null ? 1 : power;
    var t = ctx.currentTime;
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.playbackRate.value = 0.75 + Math.random() * 0.4;

    var lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(1800, t);
    lp.frequency.exponentialRampToValueAtTime(110, t + 0.85);
    lp.Q.value = 0.9;

    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.4 * power, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.05);

    src.connect(lp);
    lp.connect(g);
    g.connect(sfxBus);
    src.start(t);
    src.stop(t + 1.2);

    var osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.exponentialRampToValueAtTime(38, t + 0.5);
    var og = ctx.createGain();
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.34 * power, t + 0.01);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    osc.connect(og);
    og.connect(sfxBus);
    osc.start(t);
    osc.stop(t + 0.6);
  }

  function sparkle() {
    if (!ready) return;
    var t = ctx.currentTime;
    for (var i = 0; i < 5; i++) {
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 1600 + Math.random() * 2400;
      var at = t + i * 0.035 + Math.random() * 0.02;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.055, at + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.22);
      o.connect(g);
      g.connect(sfxBus);
      o.start(at);
      o.stop(at + 0.3);
    }
  }

  function pop() {
    if (!ready) return;
    var t = ctx.currentTime;
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(880, t);
    o.frequency.exponentialRampToValueAtTime(220, t + 0.12);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.14, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g);
    g.connect(sfxBus);
    o.start(t);
    o.stop(t + 0.22);
  }

  function whoosh() {
    if (!ready) return;
    var now = ctx.currentTime;
    if (now - lastWhoosh < 0.16) return;
    lastWhoosh = now;
    var t = now;
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    var bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(420, t);
    bp.frequency.exponentialRampToValueAtTime(2400, t + 0.55);
    bp.Q.value = 1.4;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.09);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    src.connect(bp);
    bp.connect(g);
    g.connect(sfxBus);
    src.start(t);
    src.stop(t + 0.75);
  }

  function blow() {
    if (!ready) return;
    var t = ctx.currentTime;
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    var lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(1600, t);
    lp.frequency.exponentialRampToValueAtTime(260, t + 0.8);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    src.connect(lp);
    lp.connect(g);
    g.connect(sfxBus);
    src.start(t);
    src.stop(t + 1);
  }

  function tada() {
    if (!ready) return;
    var t = ctx.currentTime + 0.02;
    var seq = [523.25, 659.25, 783.99, 1046.5];
    for (var i = 0; i < seq.length; i++) bell(seq[i], t + i * 0.11, 2.2, 0.16);
    var freqs = [1046.5, 1318.5, 1567.98, 2093];
    for (var j = 0; j < freqs.length; j++) bell(freqs[j], t + 0.5 + j * 0.03, 1.8, 0.06);
  }

  function suspend() {
    if (ctx && ctx.state === "running") ctx.suspend();
  }
  function resume() {
    if (ctx && ctx.state === "suspended") ctx.resume();
  }

  return {
    start: start,
    setMusic: setMusic,
    isMusicOn: isMusicOn,
    setCustomTrack: setCustomTrack,
    clearCustomTrack: clearCustomTrack,
    hasCustomTrack: hasCustomTrack,
    boom: boom,
    sparkle: sparkle,
    pop: pop,
    whoosh: whoosh,
    blow: blow,
    tada: tada,
    suspend: suspend,
    resume: resume,
  };
})();
