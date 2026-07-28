/**
 * Auth routes — User authentication and profile management.
 * Integrates with Neon (PostgreSQL) via the @neondatabase/serverless driver.
 * Endpoints: POST /auth/signup, POST /auth/signin, POST /auth/upsert, PUT /auth/update, GET /auth/me
 */
import { Router, Request, Response } from "express";
import { createHash } from "crypto";

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
        updated_at TIMESTAMPTZ DEFAULT NOW()
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
