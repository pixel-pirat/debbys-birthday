/* ============================================================
   ✦ CONFIG — the only file you need to touch ✦
   Change `name` below, or use the "Personalize" button in the
   top-right corner (saved in your browser, no code needed).
   You can also link straight to it:  index.html?name=Sam
   ============================================================ */
(function () {
  "use strict";

  var DEFAULTS = {
    name: "Aria",

    /* {name} is replaced automatically */
    letter:
      "Some people arrive in your life like weather. You arrived like the first warm night of the year — {name} — and suddenly every window in the house was open.\n\n" +
      "Thank you for the laughing-until-it-hurts, for the way you remember the tiny things about everyone, for turning ordinary Tuesdays into stories worth retelling. You do that without even trying. It's an outrageous talent.\n\n" +
      "So here is my wish for you: a year that is gentle where it matters, brave where it counts, and absolutely ridiculous in all the right places. May you get the good kind of trouble — the kind that turns into a memory you'll still be telling people about at 2am, years from now.\n\n" +
      "And whenever you forget how much light you carry, come back to this page. The fireworks are still here.\n\nSo am I.",

    sign: "always in your corner",
    sub: "Again. Louder. With fireworks this time.",

    wishes: [
      {
        icon: "✦",
        tag: "the forecast",
        front: "100% chance of good news.",
        back:
          "Scattered confetti expected by afternoon. Storms of luck moving in from the west. This year, the weather is entirely on your side, {name}.",
      },
      {
        icon: "🍀",
        tag: "the maths",
        front: "The universe made exactly one of you.",
        back:
          "13.8 billion years of cosmic accidents, and it still hasn't managed a sequel. Statistically reckless, honestly. We're keeping you.",
      },
      {
        icon: "🔥",
        tag: "the dare",
        front: "Do one thing that scares you.",
        back:
          "Something small enough to actually start, big enough to brag about. Then tell me everything. I want the whole chaotic, glorious story.",
      },
      {
        icon: "☕",
        tag: "the small print",
        front: "Terms & conditions of being loved.",
        back:
          "Valid on bad days. Non-transferable. No expiry date. Includes 3am phone calls, terrible jokes, and unflattering photos of you — forever.",
      },
      {
        icon: "🌙",
        tag: "the reminder",
        front: "You are allowed to take up space.",
        back:
          "Loudly. Softly. However you like. This year especially — every room is measurably better with you standing in it.",
      },
      {
        icon: "🎈",
        tag: "the promise",
        front: "I'm not going anywhere.",
        back:
          "Not when it's easy, not when it's boring, not even when you're being unbearable. Which, to be fair, is rare. Happy birthday, {name}.",
      },
    ],

    /* Photos: set `src` to an image path (e.g. "photos/us.jpg")
       and it replaces the emoji placeholder. */
    memories: [
      { emoji: "🌙", caption: "the night we stayed too late", hue: 268, src: null },
      { emoji: "📸", caption: "your laugh, on record", hue: 332, src: null },
      { emoji: "🚗", caption: "the trip we still talk about", hue: 198, src: null },
    ],
  };

  var KEY = "bday.personal.v1";

  function read() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "{}") || {};
    } catch (e) {
      return {};
    }
  }

  var saved = read();
  var state = {
    name: DEFAULTS.name,
    letter: DEFAULTS.letter,
    sign: DEFAULTS.sign,
    sub: DEFAULTS.sub,
  };

  ["name", "letter", "sign", "sub"].forEach(function (k) {
    if (typeof saved[k] === "string" && saved[k].trim()) state[k] = saved[k];
  });

  try {
    var params = new URLSearchParams(location.search);
    var q = params.get("name") || params.get("to");
    if (q && q.trim()) state.name = q.trim().slice(0, 22);
  } catch (e) {}

  function fill(str) {
    return String(str == null ? "" : str).replace(/\{name\}/g, state.name);
  }

  window.BDAY = {
    DEFAULTS: DEFAULTS,
    state: state,
    wishes: DEFAULTS.wishes,
    memories: DEFAULTS.memories,
    fill: fill,

    resolved: function () {
      return {
        name: state.name,
        letter: fill(state.letter),
        sign: fill(state.sign),
        sub: fill(state.sub),
      };
    },

    save: function (patch) {
      Object.assign(state, patch);
      try {
        localStorage.setItem(
          KEY,
          JSON.stringify({
            name: state.name,
            letter: state.letter,
            sign: state.sign,
            sub: state.sub,
          })
        );
      } catch (e) {}
    },

    reset: function () {
      state.name = DEFAULTS.name;
      state.letter = DEFAULTS.letter;
      state.sign = DEFAULTS.sign;
      state.sub = DEFAULTS.sub;
      try {
        localStorage.removeItem(KEY);
      } catch (e) {}
    },
  };
})();
