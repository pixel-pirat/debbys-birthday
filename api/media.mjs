/* POST   — admin-only: upload/replace the file for a slot.
             body: { slot, filename, mimeType, dataBase64 }
   DELETE — admin-only: remove the file for a slot (?slot=...), reverting
             to the built-in placeholder. */
import { neon } from "@neondatabase/serverless";
import { put, del } from "@vercel/blob";

const sql = neon(process.env.DATABASE_URL);
const SLOTS = new Set(["music", "memory-0", "memory-1", "memory-2"]);
const MAX_BYTES = 4 * 1024 * 1024; // Vercel serverless functions cap request bodies around 4.5MB

function checkAuth(req, res) {
  if (!process.env.ADMIN_TOKEN || req.headers["x-admin-token"] !== process.env.ADMIN_TOKEN) {
    res.status(401).json({ error: "Wrong passphrase." });
    return false;
  }
  return true;
}

export default async function handler(req, res) {
  if (req.method === "POST") {
    if (!checkAuth(req, res)) return;
    const body = req.body || {};
    const slot = body.slot;
    const filename = typeof body.filename === "string" ? body.filename : "file";
    const mimeType = typeof body.mimeType === "string" ? body.mimeType : "application/octet-stream";
    if (!SLOTS.has(slot)) {
      res.status(400).json({ error: "Unknown slot." });
      return;
    }
    if (!body.dataBase64) {
      res.status(400).json({ error: "No file data." });
      return;
    }
    let buffer;
    try {
      buffer = Buffer.from(body.dataBase64, "base64");
    } catch (e) {
      res.status(400).json({ error: "Couldn't read that file." });
      return;
    }
    if (buffer.length === 0) {
      res.status(400).json({ error: "That file came through empty." });
      return;
    }
    if (buffer.length > MAX_BYTES) {
      res.status(413).json({ error: "That file is too large for an in-browser upload (about 4MB max). Try a smaller or more compressed file." });
      return;
    }

    try {
      const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
      const blob = await put("bday/" + slot + "-" + Date.now() + "-" + safeName, buffer, {
        access: "public",
        contentType: mimeType,
        addRandomSuffix: false,
      });

      const existingRows = await sql`SELECT url FROM media WHERE slot = ${slot}`;
      await sql`
        INSERT INTO media (slot, url, filename, mime_type, updated_at)
        VALUES (${slot}, ${blob.url}, ${filename}, ${mimeType}, now())
        ON CONFLICT (slot) DO UPDATE SET url = EXCLUDED.url, filename = EXCLUDED.filename, mime_type = EXCLUDED.mime_type, updated_at = now()
      `;

      if (existingRows[0]) {
        try {
          await del(existingRows[0].url);
        } catch (e) {
          /* old blob cleanup is best-effort */
        }
      }

      res.status(200).json({ ok: true, url: blob.url });
    } catch (e) {
      res.status(500).json({ error: "Upload failed." });
    }
    return;
  }

  if (req.method === "DELETE") {
    if (!checkAuth(req, res)) return;
    const slot = req.query && req.query.slot;
    if (!SLOTS.has(slot)) {
      res.status(400).json({ error: "Unknown slot." });
      return;
    }
    try {
      const existingRows = await sql`SELECT url FROM media WHERE slot = ${slot}`;
      if (existingRows[0]) {
        try {
          await del(existingRows[0].url);
        } catch (e) {}
        await sql`DELETE FROM media WHERE slot = ${slot}`;
      }
      res.status(200).json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: "Couldn't remove that file." });
    }
    return;
  }

  res.setHeader("Allow", "POST, DELETE");
  res.status(405).json({ error: "Method not allowed." });
}
