/* One-off setup script: creates the tables this site needs and seeds the
   first row of content. Safe to re-run — everything is IF NOT EXISTS /
   ON CONFLICT DO NOTHING.
   Run:  node scripts/migrate.mjs   (reads DATABASE_URL from .env.local) */
import { readFileSync } from "fs";
import { neon } from "@neondatabase/serverless";

function loadEnvLocal() {
  try {
    var text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    text.split("\n").forEach(function (line) {
      var m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    });
  } catch (e) {}
}
loadEnvLocal();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set (checked process.env and .env.local).");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

const DEFAULT_LETTER =
  "Some people arrive in your life like weather. You arrived like the first warm night of the year — {name} — and suddenly every window in the house was open.\n\n" +
  "Thank you for the laughing-until-it-hurts, for the way you remember the tiny things about everyone, for turning ordinary Tuesdays into stories worth retelling. You do that without even trying. It's an outrageous talent.\n\n" +
  "So here is my wish for you: a year that is gentle where it matters, brave where it counts, and absolutely ridiculous in all the right places. May you get the good kind of trouble — the kind that turns into a memory you'll still be telling people about at 2am, years from now.\n\n" +
  "And whenever you forget how much light you carry, come back to this page. The fireworks are still here.\n\nSo am I.";

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS content (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      letter TEXT NOT NULL,
      sign TEXT NOT NULL,
      sub TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS media (
      slot TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      filename TEXT,
      mime_type TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await sql`
    INSERT INTO content (id, name, letter, sign, sub)
    VALUES ('default', 'Deborah', ${DEFAULT_LETTER}, 'always in your corner', 'Again. Louder. With fireworks this time.')
    ON CONFLICT (id) DO NOTHING
  `;
  const [row] = await sql`SELECT id, name FROM content WHERE id = 'default'`;
  console.log("content row:", row);
  console.log("Migration complete.");
}

main().catch(function (e) {
  console.error(e);
  process.exit(1);
});
