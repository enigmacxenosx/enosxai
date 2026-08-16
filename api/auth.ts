import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHash, randomUUID } from "node:crypto";

type UserRow = {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string;
  provider: string;
  password_hash: string | null;
  ai_personality: string | null;
  language: string | null;
  notifications: boolean | null;
  compact_mode: boolean | null;
  theme: string | null;
  wallpaper: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type NeonSql = (...args: any[]) => Promise<unknown>;

let databaseClient: NeonSql | null = null;
let databaseUnavailable = false;
let tableReady: Promise<unknown> | null = null;

function hashPassword(password: string) {
  return createHash("sha256").update(`${password}enosx_salt_2024`).digest("hex");
}

async function queryRows<T>(query: Promise<unknown>): Promise<T[]> {
  return (await query) as T[];
}

function mapUser(row: UserRow | undefined) {
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

async function getDatabase(): Promise<NeonSql | null> {
  if (databaseUnavailable) return null;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    databaseUnavailable = true;
    return null;
  }

  try {
    if (!databaseClient) {
      const { neon } = await import("@neondatabase/serverless");
      databaseClient = neon(databaseUrl) as unknown as NeonSql;
    }
    return databaseClient;
  } catch {
    databaseUnavailable = true;
    return null;
  }
}

async function ensureTable(database: NeonSql) {
  if (!tableReady) {
    tableReady = database`
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
    `;
  }
  await tableReady;
}

function actionFromRequest(req: VercelRequest) {
  const rawAction = req.query.action;
  return Array.isArray(rawAction) ? rawAction[0] : rawAction;
}

function bodyFromRequest(req: VercelRequest) {
  if (!req.body) return {} as Record<string, unknown>;
  if (typeof req.body !== "string") return req.body as Record<string, unknown>;
  try {
    return JSON.parse(req.body) as Record<string, unknown>;
  } catch {
    return {} as Record<string, unknown>;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  let action: string | string[] | undefined = "request";

  try {
    action = actionFromRequest(req);
    const body = bodyFromRequest(req);
    const database = await getDatabase();
    if (!database) {
      res.status(503).json({ message: "Email authentication is unavailable until DATABASE_URL is configured." });
      return;
    }

    await ensureTable(database);

    if (action === "signup" && req.method === "POST") {
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const password = typeof body.password === "string" ? body.password : "";
      const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
      const id = typeof body.id === "string" && body.id ? body.id : `email_${randomUUID()}`;
      const avatarUrl = typeof body.avatarUrl === "string" ? body.avatarUrl : "";
      const provider = typeof body.provider === "string" ? body.provider : "email";

      if (!email || !password || !displayName) {
        res.status(400).json({ message: "Display name, email, and password are required" });
        return;
      }

      const inserted = await queryRows<UserRow>(database`
        INSERT INTO enosx_users (id, email, display_name, avatar_url, provider, password_hash)
        VALUES (${id}, ${email}, ${displayName}, ${avatarUrl}, ${provider}, ${hashPassword(password)})
        ON CONFLICT (email) DO NOTHING
        RETURNING *
      `);

      if (!inserted[0]) {
        res.status(409).json({ message: "An account with this email already exists" });
        return;
      }

      res.status(201).json({ user: mapUser(inserted[0]) });
      return;
    }

    if (action === "signin" && req.method === "POST") {
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const password = typeof body.password === "string" ? body.password : "";

      if (!email || !password) {
        res.status(400).json({ message: "Email and password are required" });
        return;
      }

      const rows = await queryRows<UserRow>(database`SELECT * FROM enosx_users WHERE email = ${email} LIMIT 1`);
      const user = rows[0];
      if (!user || (user.password_hash && user.password_hash !== hashPassword(password))) {
        res.status(401).json({ message: "Invalid email or password" });
        return;
      }

      res.status(200).json({ user: mapUser(user) });
      return;
    }

    if (action === "upsert" && req.method === "POST") {
      const id = typeof body.id === "string" ? body.id : "";
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
      const avatarUrl = typeof body.avatarUrl === "string" ? body.avatarUrl : "";
      const provider = typeof body.provider === "string" ? body.provider : "google";

      if (!id || !email) {
        res.status(400).json({ message: "Email and ID are required" });
        return;
      }

      const rows = await queryRows<UserRow>(database`
        INSERT INTO enosx_users (id, email, display_name, avatar_url, provider, updated_at)
        VALUES (${id}, ${email}, ${displayName}, ${avatarUrl}, ${provider}, NOW())
        ON CONFLICT (email) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          avatar_url = EXCLUDED.avatar_url,
          updated_at = NOW()
        RETURNING *
      `);

      res.status(200).json({ user: mapUser(rows[0]) });
      return;
    }

    if (action === "update" && req.method === "PUT") {
      const id = typeof body.id === "string" ? body.id : "";
      if (!id) {
        res.status(400).json({ message: "User ID required" });
        return;
      }

      const rows = await queryRows<UserRow>(database`
        UPDATE enosx_users SET
          display_name = COALESCE(${typeof body.displayName === "string" ? body.displayName.trim() : null}, display_name),
          ai_personality = COALESCE(${typeof body.aiPersonality === "string" ? body.aiPersonality : null}, ai_personality),
          language = COALESCE(${typeof body.language === "string" ? body.language : null}, language),
          notifications = COALESCE(${typeof body.notifications === "boolean" ? body.notifications : null}, notifications),
          compact_mode = COALESCE(${typeof body.compactMode === "boolean" ? body.compactMode : null}, compact_mode),
          theme = COALESCE(${typeof body.theme === "string" ? body.theme : null}, theme),
          wallpaper = COALESCE(${typeof body.wallpaper === "string" ? body.wallpaper : null}, wallpaper),
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `);

      if (!rows[0]) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      res.status(200).json({ user: mapUser(rows[0]) });
      return;
    }

    if (action === "me" && req.method === "GET") {
      const id = typeof req.query.id === "string" ? req.query.id : "";
      if (!id) {
        res.status(400).json({ message: "User ID required" });
        return;
      }

      const rows = await queryRows<UserRow>(database`SELECT * FROM enosx_users WHERE id = ${id} LIMIT 1`);
      if (!rows[0]) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      res.status(200).json({ user: mapUser(rows[0]) });
      return;
    }

    res.status(404).json({ message: "Auth route not found" });
  } catch (error) {
    const actionName = Array.isArray(action) ? action[0] : action;
    console.error(`Auth ${actionName ?? "request"} failed`, error);
    res.status(500).json({ message: actionName === "signin" ? "Sign in failed" : actionName === "signup" ? "Sign up failed" : "Authentication request failed" });
  }
}
