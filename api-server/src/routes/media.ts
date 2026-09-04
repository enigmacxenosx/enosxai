import { Router, Request, Response } from "express";
import { createHmac, randomUUID, timingSafeEqual } from "crypto";

const router = Router();
const MAX_BYTES = 25 * 1024 * 1024;
const MEDIA_URL_TTL_SECONDS = 60 * 60;

function mediaSigningSecret() {
  return process.env.ENOSX_MEDIA_SIGNING_SECRET || process.env.DATABASE_URL || "enosx-media-dev";
}

function createMediaToken(id: string, userId: string, expires: number) {
  const payload = id + "." + userId + "." + expires;
  return createHmac("sha256", mediaSigningSecret()).update(payload).digest("base64url");
}

function hasValidMediaToken(id: string, userId: string, expires: number, token: string) {
  if (!Number.isFinite(expires) || expires < Math.floor(Date.now() / 1000) || !token) return false;
  const expected = createMediaToken(id, userId, expires);
  if (expected.length !== token.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}

async function queryNeon(sql: string, params: any[] = []) {
  const neonUrl = process.env.DATABASE_URL;
  if (!neonUrl) throw new Error("DATABASE_URL not configured");
  try {
    const { neon } = await import("@neondatabase/serverless");
    return await neon(neonUrl).query(sql, params);
  } catch {
    const { default: pg } = await import("pg");
    const client = new pg.Client({ connectionString: neonUrl });
    await client.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows;
    } finally {
      await client.end();
    }
  }
}

async function ensureMediaTables() {
  await queryNeon("CREATE TABLE IF NOT EXISTS enosx_media_folders (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(user_id, name))");
  await queryNeon("CREATE TABLE IF NOT EXISTS enosx_media_assets (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, folder_id TEXT REFERENCES enosx_media_folders(id) ON DELETE SET NULL, name TEXT NOT NULL, mime_type TEXT, size_bytes BIGINT NOT NULL, content TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW())");
  await queryNeon("CREATE INDEX IF NOT EXISTS enosx_media_assets_user_idx ON enosx_media_assets(user_id, created_at DESC)");
  await queryNeon("CREATE TABLE IF NOT EXISTS enosx_media_playlists (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL, media_ids JSONB NOT NULL DEFAULT '[]'::jsonb, created_at TIMESTAMPTZ DEFAULT NOW(), UNIQUE(user_id, name))");
}

ensureMediaTables().catch((error) => console.warn("Could not ensure media tables:", error));

function requireUserId(req: Request, res: Response) {
  const userId = String(req.body?.userId || req.query.userId || "").trim();
  if (!userId) {
    res.status(400).json({ message: "User ID required" });
    return null;
  }
  return userId;
}

function parseMediaIds(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((id): id is string => typeof id === "string");
  if (typeof value === "string") {
    try { return parseMediaIds(JSON.parse(value)); } catch { return []; }
  }
  return [];
}

function contentUrl(id: string, userId: string) {
  const expires = Math.floor(Date.now() / 1000) + MEDIA_URL_TTL_SECONDS;
  const token = createMediaToken(id, userId, expires);
  return "/api/media/" + encodeURIComponent(id) + "/content?userId=" + encodeURIComponent(userId) + "&expires=" + expires + "&token=" + encodeURIComponent(token);
}

router.get("/media", async (req: Request, res: Response) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  try {
    const search = String(req.query.search || "").trim();
    const folderId = String(req.query.folderId || "").trim();
    const params: any[] = [userId];
    let where = "user_id = $1";
    if (search) { params.push("%" + search + "%"); where += " AND name ILIKE $" + params.length; }
    if (folderId) { params.push(folderId); where += " AND folder_id = $" + params.length; }
    const assets = await queryNeon("SELECT id, name, mime_type, size_bytes, folder_id, created_at FROM enosx_media_assets WHERE " + where + " ORDER BY created_at DESC", params);
    const folders = await queryNeon("SELECT id, name, created_at FROM enosx_media_folders WHERE user_id = $1 ORDER BY name ASC", [userId]);
    const playlists = await queryNeon("SELECT id, name, media_ids, created_at FROM enosx_media_playlists WHERE user_id = $1 ORDER BY name ASC", [userId]);
    res.json({
      assets: assets.map((asset: any) => ({ id: asset.id, name: asset.name, mimeType: asset.mime_type || "application/octet-stream", sizeBytes: Number(asset.size_bytes), folderId: asset.folder_id, createdAt: asset.created_at, contentUrl: contentUrl(asset.id, userId) })),
      folders,
      playlists: playlists.map((playlist: any) => ({ ...playlist, mediaIds: parseMediaIds(playlist.media_ids) })),
    });
  } catch (error) {
    console.error("Media list error:", error);
    res.status(500).json({ message: "Failed to load media library" });
  }
});

router.post("/media", async (req: Request, res: Response) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const { name, mimeType, sizeBytes, content, folderId } = req.body || {};
  if (!name || typeof content !== "string" || !/^data:[^;,]+;base64,/i.test(content)) {
    res.status(400).json({ message: "A file name and base64 data URL are required" });
    return;
  }
  const size = Number(sizeBytes);
  if (!Number.isFinite(size) || size < 0 || size > MAX_BYTES) {
    res.status(413).json({ message: "Files must be 25MB or smaller" });
    return;
  }
  try {
    if (folderId) {
      const folder = await queryNeon("SELECT id FROM enosx_media_folders WHERE id = $1 AND user_id = $2", [folderId, userId]);
      if (!folder[0]) { res.status(404).json({ message: "Folder not found" }); return; }
    }
    const id = randomUUID();
    const rows = await queryNeon("INSERT INTO enosx_media_assets (id, user_id, folder_id, name, mime_type, size_bytes, content) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, name, mime_type, size_bytes, folder_id, created_at", [id, userId, folderId || null, String(name).slice(0, 255), mimeType || "application/octet-stream", Math.floor(size), content]);
    const asset = rows[0];
    res.status(201).json({ asset: { id: asset.id, name: asset.name, mimeType: asset.mime_type, sizeBytes: Number(asset.size_bytes), folderId: asset.folder_id, createdAt: asset.created_at, contentUrl: contentUrl(asset.id, userId) } });
  } catch (error) {
    console.error("Media upload error:", error);
    res.status(500).json({ message: "Failed to save media" });
  }
});

router.post("/media/folders", async (req: Request, res: Response) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const name = String(req.body?.name || "").trim().slice(0, 80);
  if (!name) { res.status(400).json({ message: "Folder name required" }); return; }
  try {
    const rows = await queryNeon("INSERT INTO enosx_media_folders (id, user_id, name) VALUES ($1, $2, $3) ON CONFLICT (user_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING id, name, created_at", [randomUUID(), userId, name]);
    res.status(201).json({ folder: rows[0] });
  } catch (error) { console.error("Folder create error:", error); res.status(500).json({ message: "Failed to create folder" }); }
});

router.post("/media/playlists", async (req: Request, res: Response) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const name = String(req.body?.name || "").trim().slice(0, 80);
  if (!name) { res.status(400).json({ message: "Playlist name required" }); return; }
  try {
    const rows = await queryNeon("INSERT INTO enosx_media_playlists (id, user_id, name, media_ids) VALUES ($1, $2, $3, '[]'::jsonb) ON CONFLICT (user_id, name) DO UPDATE SET name = EXCLUDED.name RETURNING id, name, media_ids, created_at", [randomUUID(), userId, name]);
    res.status(201).json({ playlist: { ...rows[0], mediaIds: parseMediaIds(rows[0].media_ids) } });
  } catch (error) { console.error("Playlist create error:", error); res.status(500).json({ message: "Failed to create playlist" }); }
});

router.post("/media/playlists/:id/items", async (req: Request, res: Response) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const mediaId = String(req.body?.mediaId || "").trim();
  if (!mediaId) { res.status(400).json({ message: "Media ID required" }); return; }
  try {
    const asset = await queryNeon("SELECT id FROM enosx_media_assets WHERE id = $1 AND user_id = $2", [mediaId, userId]);
    if (!asset[0]) { res.status(404).json({ message: "Media not found" }); return; }
    const playlists = await queryNeon("SELECT media_ids FROM enosx_media_playlists WHERE id = $1 AND user_id = $2", [req.params.id, userId]);
    if (!playlists[0]) { res.status(404).json({ message: "Playlist not found" }); return; }
    const mediaIds = parseMediaIds(playlists[0].media_ids);
    if (!mediaIds.includes(mediaId)) mediaIds.push(mediaId);
    const rows = await queryNeon("UPDATE enosx_media_playlists SET media_ids = $1::jsonb WHERE id = $2 AND user_id = $3 RETURNING id, name, media_ids, created_at", [JSON.stringify(mediaIds), req.params.id, userId]);
    res.json({ playlist: { ...rows[0], mediaIds: parseMediaIds(rows[0].media_ids) } });
  } catch (error) { console.error("Playlist item error:", error); res.status(500).json({ message: "Failed to update playlist" }); }
});

router.delete("/media/playlists/:id/items/:mediaId", async (req: Request, res: Response) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  try {
    const playlists = await queryNeon("SELECT media_ids FROM enosx_media_playlists WHERE id = $1 AND user_id = $2", [req.params.id, userId]);
    if (!playlists[0]) { res.status(404).json({ message: "Playlist not found" }); return; }
    const mediaIds = parseMediaIds(playlists[0].media_ids).filter((id) => id !== req.params.mediaId);
    await queryNeon("UPDATE enosx_media_playlists SET media_ids = $1::jsonb WHERE id = $2 AND user_id = $3", [JSON.stringify(mediaIds), req.params.id, userId]);
    res.json({ success: true });
  } catch (error) { console.error("Playlist remove error:", error); res.status(500).json({ message: "Failed to remove playlist item" }); }
});

router.get("/media/:id/content", async (req: Request, res: Response) => {
  const userId = String(req.query.userId || "").trim();
  if (!userId) { res.status(400).json({ message: "User ID required" }); return; }
  const expires = Number(req.query.expires);
  const token = String(req.query.token || "");
  if (!hasValidMediaToken(req.params.id, userId, expires, token)) {
    res.status(401).json({ message: "Signed media URL is missing or expired" });
    return;
  }
  try {
    const rows = await queryNeon("SELECT name, mime_type, content FROM enosx_media_assets WHERE id = $1 AND user_id = $2", [req.params.id, userId]);
    if (!rows[0]) { res.status(404).json({ message: "Media not found" }); return; }
    const match = String(rows[0].content).match(/^data:[^;,]+;base64,(.*)$/is);
    if (!match) { res.status(422).json({ message: "Stored media is invalid" }); return; }
    res.setHeader("Content-Type", rows[0].mime_type || "application/octet-stream");
    res.setHeader("Content-Disposition", "inline; filename*=UTF-8''" + encodeURIComponent(rows[0].name));
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.send(Buffer.from(match[1], "base64"));
  } catch (error) { console.error("Media content error:", error); res.status(500).json({ message: "Failed to load media" }); }
});

router.put("/media/:id", async (req: Request, res: Response) => {
  const userId = requireUserId(req, res);
  if (!userId) return;
  const folderId = req.body?.folderId ? String(req.body.folderId) : null;
  try {
    if (folderId) {
      const folder = await queryNeon("SELECT id FROM enosx_media_folders WHERE id = $1 AND user_id = $2", [folderId, userId]);
      if (!folder[0]) { res.status(404).json({ message: "Folder not found" }); return; }
    }
    const rows = await queryNeon("UPDATE enosx_media_assets SET folder_id = $1 WHERE id = $2 AND user_id = $3 RETURNING id, name, mime_type, size_bytes, folder_id, created_at", [folderId, req.params.id, userId]);
    if (!rows[0]) { res.status(404).json({ message: "Media not found" }); return; }
    const asset = rows[0];
    res.json({ asset: { id: asset.id, name: asset.name, mimeType: asset.mime_type, sizeBytes: Number(asset.size_bytes), folderId: asset.folder_id, createdAt: asset.created_at, contentUrl: contentUrl(asset.id, userId) } });
  } catch (error) { console.error("Media move error:", error); res.status(500).json({ message: "Failed to move media" }); }
});

router.delete("/media/:id", async (req: Request, res: Response) => {
  const userId = String(req.query.userId || "").trim();
  if (!userId) { res.status(400).json({ message: "User ID required" }); return; }
  try {
    const result = await queryNeon("DELETE FROM enosx_media_assets WHERE id = $1 AND user_id = $2 RETURNING id", [req.params.id, userId]);
    if (!result[0]) { res.status(404).json({ message: "Media not found" }); return; }
    res.json({ success: true });
  } catch (error) { console.error("Media delete error:", error); res.status(500).json({ message: "Failed to delete media" }); }
});

export default router;
