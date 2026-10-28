/* GET  — public: the current name/letter/sign/sub plus media URLs.
   PUT  — admin-only (x-admin-token header): updates the text fields. */
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const rows = await sql`SELECT name, letter, sign, sub FROM content WHERE id = 'default'`;
      const mediaRows = await sql`SELECT slot, url, filename, mime_type FROM media`;
      const media = {};
      for (const r of mediaRows) media[r.slot] = { url: r.url, filename: r.filename, mimeType: r.mime_type };
      res.setHeader("Cache-Control", "no-store");
      res.status(200).json(Object.assign({}, rows[0] || {}, { media: media }));
    } catch (e) {
      res.status(500).json({ error: "Could not load content." });
    }
    return;
  }

  if (req.method === "PUT") {
    if (!process.env.ADMIN_TOKEN || req.headers["x-admin-token"] !== process.env.ADMIN_TOKEN) {
      res.status(401).json({ error: "Wrong passphrase." });
      return;
    }
    const body = req.body || {};
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 22) : null;
    const letter = typeof body.letter === "string" ? body.letter : null;
    const sign = typeof body.sign === "string" ? body.sign.slice(0, 40) : null;
    const sub = typeof body.sub === "string" ? body.sub.slice(0, 90) : null;
    if (!name || !letter || !sign || !sub) {
      res.status(400).json({ error: "Missing a required field." });
      return;
    }
    try {
      await sql`
        UPDATE content SET name = ${name}, letter = ${letter}, sign = ${sign}, sub = ${sub}, updated_at = now()
        WHERE id = 'default'
      `;
      res.status(200).json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: "Could not save." });
    }
    return;
  }

  res.setHeader("Allow", "GET, PUT");
  res.status(405).json({ error: "Method not allowed." });
}
