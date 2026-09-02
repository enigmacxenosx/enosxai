/**
 * Auth routes — User authentication and profile management.
 * Integrates with Neon (PostgreSQL) via the @neondatabase/serverless driver.
 * Endpoints: POST /auth/signup, POST /auth/signin, POST /auth/upsert, PUT /auth/update, GET /auth/me
 */
import { Router, Request, Response } from "express";
import { createHash, createHmac, timingSafeEqual } from "crypto";

const router = Router();

// ── Neon DB helper ────────────────────────────────────────────────────────────
// Uses the Neon serverless HTTP driver for edge-compatible queries.
async function queryNeon(sql: string, params: any[] = []) {
  const neonUrl = process.env.DATABASE_URL;
  if (!neonUrl) {
    throw new Error("DATABASE_URL not configured");
  }
  // Use @neondatabase/serverless if available, otherwise fall back to pg
  try {
    const { neon } = await import("@neondatabase/serverless");
    const db = neon(neonUrl);
    // Use the driver's `.query()` method for parameterized string queries
    // (the default tagged-template call signature only accepts template literals).
    return await db.query(sql, params);
  } catch {
    // Fallback: use node-postgres
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

// ── Ensure users table exists ─────────────────────────────────────────────────
async function ensureTable() {
  try {
    await queryNeon(`
      CREATE TABLE IF NOT EXISTS enosx_users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        display_name TEXT,
        avatar_url TEXT,
        provider TEXT DEFAULT 'email',
        password_hash TEXT,
        ai_personality TEXT DEFAULT 'assistant',
        language TEXT DEFAULT 'English',
        notifications BOOLEAN DEFAULT true,
        compact_mode BOOLEAN DEFAULT false,
        theme TEXT,
        wallpaper TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        role TEXT DEFAULT 'user'
      )
    `);
  } catch (err) {
    console.warn("Could not ensure table:", err);
  }
}

// Initialize table on startup
ensureTable().catch(console.warn);

function hashPassword(password: string): string {
  return createHash("sha256").update(password + "enosx_salt_2024").digest("hex");
}

// ── POST /auth/signup ─────────────────────────────────────────────────────────
router.post("/auth/signup", async (req: Request, res: Response) => {
  try {
    const { id, email, displayName, avatarUrl, provider, password } = req.body;
    if (!email || !id) {
      res.status(400).json({ message: "Email and ID are required" });
      return;
    }
    const passwordHash = password ? hashPassword(password) : null;
    await queryNeon(
      `INSERT INTO enosx_users (id, email, display_name, avatar_url, provider, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO NOTHING`,
      [id, email, displayName ?? "", avatarUrl ?? "", provider ?? "email", passwordHash]
    );
    const rows = await queryNeon("SELECT * FROM enosx_users WHERE email = $1", [email]);
    const user = rows[0];
    if (!user) {
      res.status(409).json({ message: "Email already exists" });
      return;
    }
    res.json({ user: mapUser(user) });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ message: "Signup failed" });
  }
});

// ── POST /auth/signin ─────────────────────────────────────────────────────────
router.post("/auth/signin", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required" });
      return;
    }
    const rows = await queryNeon("SELECT * FROM enosx_users WHERE email = $1", [email]);
    const user = rows[0];
    if (!user) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }
    const hash = hashPassword(password);
    if (user.password_hash && user.password_hash !== hash) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }
    res.json({ user: mapUser(user) });
  } catch (err) {
    console.error("Signin error:", err);
    res.status(500).json({ message: "Sign in failed" });
  }
});

// ── POST /auth/upsert (Google OAuth) ─────────────────────────────────────────
router.post("/auth/upsert", async (req: Request, res: Response) => {
  try {
    const { id, email, displayName, avatarUrl, provider } = req.body;
    if (!email || !id) {
      res.status(400).json({ message: "Email and ID are required" });
      return;
    }
    await queryNeon(
      `INSERT INTO enosx_users (id, email, display_name, avatar_url, provider, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (email) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         avatar_url = EXCLUDED.avatar_url,
         updated_at = NOW()`,
      [id, email, displayName ?? "", avatarUrl ?? "", provider ?? "google"]
    );
    const rows = await queryNeon("SELECT * FROM enosx_users WHERE email = $1", [email]);
    res.json({ user: mapUser(rows[0]) });
  } catch (err) {
    console.error("Upsert error:", err);
    res.status(500).json({ message: "Upsert failed" });
  }
});

// ── PUT /auth/update ──────────────────────────────────────────────────────────
router.put("/auth/update", async (req: Request, res: Response) => {
  try {
    const { id, displayName, aiPersonality, language, notifications, compactMode, theme, wallpaper } = req.body;
    if (!id) {
      res.status(400).json({ message: "User ID required" });
      return;
    }
    await queryNeon(
      `UPDATE enosx_users SET
         display_name = COALESCE($2, display_name),
         ai_personality = COALESCE($3, ai_personality),
         language = COALESCE($4, language),
         notifications = COALESCE($5, notifications),
         compact_mode = COALESCE($6, compact_mode),
         theme = COALESCE($7, theme),
         wallpaper = COALESCE($8, wallpaper),
         updated_at = NOW()
       WHERE id = $1`,
      [id, displayName, aiPersonality, language, notifications, compactMode, theme, wallpaper]
    );
    const rows = await queryNeon("SELECT * FROM enosx_users WHERE id = $1", [id]);
    res.json({ user: mapUser(rows[0]) });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ message: "Update failed" });
  }
});

// ── GET /auth/me ──────────────────────────────────────────────────────────────
router.get("/auth/me", async (req: Request, res: Response) => {
  try {
    const { id } = req.query;
    if (!id) {
      res.status(400).json({ message: "User ID required" });
      return;
    }
    const rows = await queryNeon("SELECT * FROM enosx_users WHERE id = $1", [id]);
    if (!rows[0]) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json({ user: mapUser(rows[0]) });
  } catch (err) {
    console.error("Get user error:", err);
    res.status(500).json({ message: "Failed to get user" });
  }
});

const CEO_PROFILE_TABLE = `
  CREATE TABLE IF NOT EXISTS enosx_ceo_profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    display_name TEXT NOT NULL,
    title TEXT NOT NULL,
    notes TEXT DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )
`;

function base64Url(value: string): string {
  return Buffer.from(value).toString("base64url");
}

function createCeoSession(userId: string, email: string): string {
  const secret = process.env.ENOSX_CEO_SESSION_SECRET;
  if (!secret) throw new Error("ENOSX_CEO_SESSION_SECRET not configured");
  const payload = base64Url(JSON.stringify({ sub: userId, email, role: "ceo", exp: Date.now() + 1000 * 60 * 60 * 12 }));
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function verifyCeoSession(req: Request): { sub: string; email: string } | null {
  const secret = process.env.ENOSX_CEO_SESSION_SECRET;
  const token = req.headers.authorization?.replace(/^Bearer\\s+/i, "");
  if (!secret || !token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (decoded.role !== "ceo" || decoded.exp < Date.now()) return null;
    return { sub: decoded.sub, email: decoded.email };
  } catch { return null; }
}

router.post("/auth/ceo/session", async (req: Request, res: Response) => {
  try {
    const { id, email } = req.body;
    const configuredCeoEmail = process.env.ENOSX_CEO_EMAIL?.trim().toLowerCase();
    if (!configuredCeoEmail || !process.env.ENOSX_CEO_SESSION_SECRET) {
      res.status(503).json({ message: "CEO authentication is not configured on this server" });
      return;
    }
    if (!id || !email || email.trim().toLowerCase() !== configuredCeoEmail) {
      res.status(403).json({ message: "CEO profile access denied" });
      return;
    }
    const rows = await queryNeon("SELECT id, email FROM enosx_users WHERE id = $1 AND email = $2", [id, email.trim().toLowerCase()]);
    if (!rows[0]) {
      res.status(403).json({ message: "Authenticated CEO account not found" });
      return;
    }
    await queryNeon(CEO_PROFILE_TABLE);
    await queryNeon(`INSERT INTO enosx_ceo_profile (id, display_name, title) VALUES (1, $1, $2) ON CONFLICT (id) DO NOTHING`, ["Enosh Yeswa", "Founder & Chief Executive Officer"]);
    res.json({ token: createCeoSession(id, email.trim().toLowerCase()), expiresIn: 43200 });
  } catch (err) {
    console.error("CEO session error:", err);
    res.status(500).json({ message: "CEO session creation failed" });
  }
});

router.get("/auth/ceo/profile", async (req: Request, res: Response) => {
  const session = verifyCeoSession(req);
  if (!session) { res.status(401).json({ message: "Valid CEO session required" }); return; }
  try {
    const rows = await queryNeon("SELECT id, email FROM enosx_users WHERE id = $1 AND email = $2", [session.sub, session.email]);
    if (!rows[0]) { res.status(401).json({ message: "CEO account is no longer valid" }); return; }
    await queryNeon(CEO_PROFILE_TABLE);
    const profile = await queryNeon("SELECT display_name, title, notes, updated_at FROM enosx_ceo_profile WHERE id = 1");
    res.json({ profile: profile[0] });
  } catch (err) { console.error("CEO profile read error:", err); res.status(500).json({ message: "CEO profile unavailable" }); }
});

router.put("/auth/ceo/profile", async (req: Request, res: Response) => {
  const session = verifyCeoSession(req);
  if (!session) { res.status(401).json({ message: "Valid CEO session required" }); return; }
  try {
    const rows = await queryNeon("SELECT id FROM enosx_users WHERE id = $1 AND email = $2", [session.sub, session.email]);
    if (!rows[0]) { res.status(401).json({ message: "CEO account is no longer valid" }); return; }
    await queryNeon(CEO_PROFILE_TABLE);
    const notes = typeof req.body.notes === "string" ? req.body.notes.slice(0, 20000) : "";
    await queryNeon("UPDATE enosx_ceo_profile SET notes = $1, updated_at = NOW() WHERE id = 1", [notes]);
    res.json({ ok: true });
  } catch (err) { console.error("CEO profile update error:", err); res.status(500).json({ message: "CEO profile update failed" }); }
});

// ── Map DB row to UserProfile ─────────────────────────────────────────────────
function mapUser(row: any) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    provider: row.provider,
    aiPersonality: row.ai_personality,
    language: row.language,
    notifications: row.notifications,
    compactMode: row.compact_mode,
    theme: row.theme,
    wallpaper: row.wallpaper,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export default router;
