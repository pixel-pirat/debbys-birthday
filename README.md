# ✦ Happy Birthday

A hand-built, single-page birthday universe: a name assembled from stardust, a cake you can
actually blow out, fireworks with real physics, a sealed letter, and a very unreasonable
amount of glitter.

No build step, no framework, no API keys. Just open it.

---

## Open it

**Easiest** — double-click `index.html`. Everything works except the microphone (browsers block
mic access on `file://` pages).

**Best** — run the tiny local server, which unlocks the "blow out the candles with your real breath"
mode:

```bash
node serve.js
# → http://localhost:4173
```

---

## Put their name in it

Three ways, pick whichever is easiest:

1. **In the page** — click **Personalize** (top right, or press `P`), type the name, hit
   *Save & celebrate*. It's remembered in that browser. You can also rewrite the letter and
   the sign-off there, and copy a link with the name baked in to send to them.
2. **In the URL** — `index.html?name=Deborah` (or `?to=Deborah`). Great for sharing:
   the link personalises itself the moment it opens.
3. **In the code** — open `js/config.js` and change the `name` at the top (and the default
   letter, wishes, memories, signature and last line while you're in there).

The name is re-rendered as particle typography, so short names look the sharpest,
but anything up to 22 characters fits.

---

## Add real photos — and your own music

**Easiest** — open **Personalize** (top right, or `P`). Under **Your photos**, click *Upload* next
to each memory to replace the emoji placeholder with a real picture. Under **Your song**, choose an
audio file and it loops in place of the built-in music-box tune. Both save straight to that browser
— via IndexedDB, nothing leaves the device and there's no server or account involved — so they're
still there next time you open the page. Each has its own ✕ *remove* to go back to the placeholder
or the music box.

**In the code** — in `js/config.js`, each memory also accepts a `src`:

```js
memories: [
  { emoji: "🌙", caption: "the night we stayed too late", hue: 268, src: "photos/us.jpg" },
  { emoji: "📸", caption: "your laugh, on record",      hue: 332, src: "photos/laugh.jpg" },
  { emoji: "🚗", caption: "the trip we still talk about", hue: 198, src: "photos/trip.jpg" },
]
```

Drop the images next to `index.html` (or in `photos/`) and the emoji placeholder is replaced.
`hue` only affects the placeholder gradient. There's no code equivalent for the music — that's
upload-only, since it's a real audio file rather than a few lines of config.

A note on sharing: photos and music uploaded through the panel live only in the browser that
uploaded them. If you send someone the `?name=` link, they won't see those — only someone opening
the page on *your* device will. To ship real photos/music to everyone, use the `js/config.js` route
above (or send the uploader your `photos/`/`music/` files to drop in alongside it).

---

## What's inside

| Chapter | What happens |
| --- | --- |
| **Gate** | A tap starts the sound and opens the universe. |
| **01 — Hero** | Their name coalesces out of ~1,750 glowing particles. Move your cursor through it. |
| **02 — Cake** | Three lit candles. Tap them, hit *Blow them out*, or allow the mic and actually blow. |
| **03 — Wishes** | Six flip cards with things the universe wants them to know. |
| **04 — Memories** | A polaroid strip — swap in your own photos. |
| **05 — Letter** | A wax-sealed letter that opens and types itself out. |
| **06 — Finale** | Balloons, a never-ending fireworks show, and a replay button. |

**Sound** is synthesised live with the Web Audio API — a music-box *Happy Birthday*, firework
booms, sparkles and paper-crackle. No audio files, nothing to download, unless you upload your
own song in Personalize, which loops in its place.

**Shortcuts:** `F` fireworks · `M` mute/unmute · `P` personalize · `Esc` close the panel ·
click anywhere for a rocket.

**Accessibility:** real headings and labels, keyboard-operable candles/cards/seal, visible focus
rings, `aria-live` status, and full `prefers-reduced-motion` support.

---

## Files

```
index.html        markup + all copy
css/style.css     the entire look
js/config.js      ← the only file you really need to edit
js/media.js       IndexedDB storage for uploaded photos & music
js/audio.js       Web Audio synth (music + sound design) + custom track playback
js/sky.js         starfield, nebula drift, shooting stars
js/fx.js          fireworks, confetti, sparkles (canvas physics)
js/name.js        particle typography
js/main.js        interactions, personalization, sequencing
serve.js          optional zero-dependency static server
```

Fonts come from Google Fonts (Playfair Display, Sora, Great Vibes) with graceful system
fallbacks, so it still looks right offline — just slightly less fancy.

Go make someone's day.
