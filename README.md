# ✦ Happy Birthday

A hand-built, single-page birthday universe: a name assembled from stardust, a cake you can
actually blow out, fireworks with real physics, a sealed letter, and a very unreasonable
amount of glitter.

The page itself is still plain HTML/CSS/JS, no framework, no build step. The name, letter, and
any photos/song you upload are shared — stored in Postgres (Neon) and Vercel Blob via a couple of
small serverless functions — so whoever opens the link sees the real thing, not just whoever set
it up.

Live at: **https://birthday-lime-delta-45.vercel.app**

---

## Personalize it

Open **Personalize** (top right, or press `P`).

1. **Admin passphrase** — paste in the passphrase (ask whoever set this project up for it; it's
   the `ADMIN_TOKEN` environment variable on Vercel). Needed for everything below; without it,
   the panel is read-only and Save/Upload will just say so.
2. **Name / letter / sign-off / last line** — edit and hit *Save & celebrate*. This updates the
   shared content in Postgres — everyone who opens the page after that sees the new version.
3. **Your photos** — *Upload* next to each memory replaces its placeholder, for everyone.
   Large images are shrunk client-side first; still, keep it under about 4MB.
4. **Your song** — choose an audio file and it loops in place of the built-in music-box tune, for
   everyone. Also capped around 4MB (a serverless function's request-size limit) — compress a
   long song first if it doesn't fit.

A `?name=Deborah` (or `?to=Deborah`) URL parameter still overrides the name for that one link,
without touching the shared content — handy for sending a few people slightly different links.

---

## Run it locally

```bash
npm install
node serve.js
# → http://localhost:4173, but /api/* won't work (that needs Vercel's dev server)
vercel dev
# → full stack, including the API routes, once `vercel link` is set up
```

`serve.js` alone is enough to look at layout/animation changes; anything touching `/api` (saving
text, uploading media) needs `vercel dev` — or just push and let Vercel's preview deploys handle it.

---

## What's inside

| Chapter | What happens |
| --- | --- |
| **Gate** | A tap starts the sound and opens the universe. |
| **01 — Hero** | Their name coalesces out of ~1,750 glowing particles. Move your cursor through it. |
| **02 — Cake** | Three lit candles. Tap them, hit *Blow them out*, or allow the mic and actually blow. |
| **03 — Wishes** | Six flip cards with things the universe wants them to know. |
| **04 — Memories** | A polaroid strip — swap in your own photos via Personalize. |
| **05 — Letter** | A wax-sealed letter that opens and types itself out. |
| **06 — Finale** | Balloons, a never-ending fireworks show, and a replay button. |

**Sound** is synthesised live with the Web Audio API — a music-box *Happy Birthday*, firework
booms, sparkles and paper-crackle — unless a song's been uploaded, which loops in its place.

**Shortcuts:** `F` fireworks · `M` mute/unmute · `P` personalize · `Esc` close the panel ·
click anywhere for a rocket.

**Accessibility:** real headings and labels, keyboard-operable candles/cards/seal, visible focus
rings, `aria-live` status, and full `prefers-reduced-motion` support.

---

## Files

```
index.html         markup + all copy
css/style.css       the entire look
js/config.js        defaults + loads/saves the shared content from the server
js/media.js         uploads photos & music to /api/media
js/audio.js         Web Audio synth (music + sound design) + custom track playback
js/sky.js           starfield, nebula drift, shooting stars
js/fx.js            fireworks, confetti, sparkles (canvas physics)
js/name.js          particle typography
js/main.js          interactions, personalization, sequencing
serve.js            zero-dependency static server (layout/animation work only)
api/content.mjs      GET the shared name/letter/sign/sub + media URLs; PUT to change them (admin)
api/media.mjs        POST to upload a photo/song, DELETE to remove one (admin)
scripts/migrate.mjs  one-off: creates the Postgres tables and seeds the first content row
```

### Environment variables (set on Vercel)

| Variable | What it's for |
| --- | --- |
| `DATABASE_URL` | Neon Postgres connection string — the `content` and `media` tables |
| `BLOB_READ_WRITE_TOKEN` | set automatically when a Vercel Blob store is connected to the project |
| `ADMIN_TOKEN` | the passphrase that gates every write (`PUT /api/content`, `POST`/`DELETE /api/media`) |

Reads (`GET /api/content`, the uploaded images/song themselves) are public — that's what makes the
page work for whoever you send it to. Only *changing* anything needs the passphrase.

Fonts come from Google Fonts (Playfair Display, Sora, Great Vibes) with graceful system
fallbacks, so it still looks right offline — just slightly less fancy.

Go make someone's day.
