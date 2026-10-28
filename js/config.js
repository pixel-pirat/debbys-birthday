/* ============================================================
   ✦ CONFIG — defaults, used until the real content loads from the
   server (js/main.js calls BDAY.loadFromServer() on startup), and as
   the fallback if the server can't be reached.

   The name/letter/sign/sub and uploaded photos/music are the SHARED,
   real content now — stored in Postgres + Vercel Blob (see api/), set
   from the Personalize panel with the admin passphrase. Anyone who
   opens the page sees the same thing; this file is just what's shown
   for the instant before that loads, and the safety net if it can't.
   ============================================================ */
(function () {
  "use strict";

  var DEFAULTS = {
    name: "Deborah",

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

    /* `src` is filled in from the server's media table once it loads. */
    memories: [
      { emoji: "🌙", caption: "the night we stayed too late", hue: 268, src: null },
      { emoji: "📸", caption: "your laugh, on record", hue: 332, src: null },
      { emoji: "🚗", caption: "the trip we still talk about", hue: 198, src: null },
    ],
  };

  var state = {
    name: DEFAULTS.name,
    letter: DEFAULTS.letter,
    sign: DEFAULTS.sign,
    sub: DEFAULTS.sub,
  };

  var urlName = null;
  try {
    var params = new URLSearchParams(location.search);
    var q = params.get("name") || params.get("to");
    if (q && q.trim()) urlName = q.trim().slice(0, 22);
  } catch (e) {}
  if (urlName) state.name = urlName;

  var TOKEN_KEY = "bday.admin.token";
  function getToken() {
    try {
      return localStorage.getItem(TOKEN_KEY) || "";
    } catch (e) {
      return "";
    }
  }
  function setToken(t) {
    try {
      if (t) localStorage.setItem(TOKEN_KEY, t);
      else localStorage.removeItem(TOKEN_KEY);
    } catch (e) {}
  }

  function fill(str) {
    return String(str == null ? "" : str).replace(/\{name\}/g, state.name);
  }

  window.BDAY = {
    DEFAULTS: DEFAULTS,
    state: state,
    wishes: DEFAULTS.wishes,
    memories: DEFAULTS.memories,
    fill: fill,
    getToken: getToken,
    setToken: setToken,

    resolved: function () {
      return {
        name: state.name,
        letter: fill(state.letter),
        sign: fill(state.sign),
        sub: fill(state.sub),
      };
    },

    /* Pulls the shared name/letter/sign/sub and media URLs from the
       server. Resolves with the server's data, or null if it couldn't
       be reached (the built-in defaults above stay in place). A name
       given in the URL (?name=) always wins, so a personalised link
       still shows that name even once the server content loads. */
    loadFromServer: function () {
      return fetch("/api/content")
        .then(function (r) {
          if (!r.ok) throw new Error("bad response");
          return r.json();
        })
        .then(function (data) {
          if (!urlName && data.name) state.name = data.name;
          if (data.letter) state.letter = data.letter;
          if (data.sign) state.sign = data.sign;
          if (data.sub) state.sub = data.sub;
          if (data.media) {
            DEFAULTS.memories.forEach(function (m, i) {
              var mm = data.media["memory-" + i];
              m.src = mm ? mm.url : null;
            });
          }
          return data;
        })
        .catch(function () {
          return null;
        });
    },

    /* Saves name/letter/sign/sub to the server. Needs the admin
       passphrase (set via BDAY.setToken) or the server rejects it. */
    save: function (patch) {
      Object.assign(state, patch);
      return fetch("/api/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-admin-token": getToken() },
        body: JSON.stringify({ name: state.name, letter: state.letter, sign: state.sign, sub: state.sub }),
      }).then(function (r) {
        if (!r.ok) {
          return r.json().then(function (d) {
            throw new Error((d && d.error) || "Save failed.");
          });
        }
        return true;
      });
    },

    reset: function () {
      state.name = DEFAULTS.name;
      state.letter = DEFAULTS.letter;
      state.sign = DEFAULTS.sign;
      state.sub = DEFAULTS.sub;
    },
  };
})();
