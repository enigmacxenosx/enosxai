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

type DatabaseClient = {
  query: (text: string, values?: unknown[]) => Promise<{ rows: unknown[] }>;
};

let pool: DatabaseClient | null = null;
let tableReady: Promise<unknown> | null = null;

function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

async function hashPassword(password: string) {
  const data = new TextEncoder().encode(`${password}enosx_salt_2024`);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function getDatabase(): Promise<DatabaseClient | null> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return null;

  try {
    if (!pool) {
      const { default: pg } = await import("pg");
      pool = new pg.Pool({ connectionString: databaseUrl, max: 1 });
    }
    return pool;
  } catch {
    return null;
  }
}

async function queryRows<T>(database: DatabaseClient, text: string, values: unknown[] = []) {
  const result = await database.query(text, values);
  return result.rows as T[];
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

async function ensureTable(database: DatabaseClient) {
  if (!tableReady) {
    tableReady = database.query(`
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
  }
  await tableReady;
}

async function parseBody(request: Request) {
  if (request.method === "GET" || request.method === "HEAD") return {} as Record<string, unknown>;
  try {
    const body = await request.json();
    return body && typeof body === "object" ? body as Record<string, unknown> : {};
  } catch {
    return {} as Record<string, unknown>;
  }
}

export default {
  async fetch(request: Request) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204 });

    const url = new URL(request.url);
    const action = url.searchParams.get("action") || url.pathname.split("/").filter(Boolean).pop() || "request";

    try {
      const body = await parseBody(request);
      const database = await getDatabase();
      if (!database) {
        return jsonResponse({ message: "Email authentication is unavailable until DATABASE_URL is configured." }, 503);
      }

      await ensureTable(database);

      if (action === "signup" && request.method === "POST") {
        const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
        const password = typeof body.password === "string" ? body.password : "";
        const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
        const id = typeof body.id === "string" && body.id ? body.id : `email_${globalThis.crypto.randomUUID()}`;
        const avatarUrl = typeof body.avatarUrl === "string" ? body.avatarUrl : "";
        const provider = typeof body.provider === "string" ? body.provider : "email";

        if (!email || !password || !displayName) {
          return jsonResponse({ message: "Display name, email, and password are required" }, 400);
        }

        const inserted = await queryRows<UserRow>(
          database,
          `INSERT INTO enosx_users (id, email, display_name, avatar_url, provider, password_hash)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (email) DO NOTHING
           RETURNING *`,
          [id, email, displayName, avatarUrl, provider, await hashPassword(password)],
        );

        if (!inserted[0]) {
          return jsonResponse({ message: "An account with this email already exists" }, 409);
        }

        return jsonResponse({ user: mapUser(inserted[0]) }, 201);
      }

      if (action === "signin" && request.method === "POST") {
        const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
        const password = typeof body.password === "string" ? body.password : "";

        if (!email || !password) {
          return jsonResponse({ message: "Email and password are required" }, 400);
        }

        const rows = await queryRows<UserRow>(
          database,
          "SELECT * FROM enosx_users WHERE email = $1 LIMIT 1",
          [email],
        );
        const user = rows[0];
        if (!user || (user.password_hash && user.password_hash !== await hashPassword(password))) {
          return jsonResponse({ message: "Invalid email or password" }, 401);
        }

        return jsonResponse({ user: mapUser(user) });
      }

      if (action === "upsert" && request.method === "POST") {
        const id = typeof body.id === "string" ? body.id : "";
        const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
        const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
        const avatarUrl = typeof body.avatarUrl === "string" ? body.avatarUrl : "";
        const provider = typeof body.provider === "string" ? body.provider : "google";

        if (!id || !email) {
          return jsonResponse({ message: "Email and ID are required" }, 400);
        }

        const rows = await queryRows<UserRow>(
          database,
          `INSERT INTO enosx_users (id, email, display_name, avatar_url, provider, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW())
           ON CONFLICT (email) DO UPDATE SET
             display_name = EXCLUDED.display_name,
             avatar_url = EXCLUDED.avatar_url,
             updated_at = NOW()
           RETURNING *`,
          [id, email, displayName, avatarUrl, provider],
        );

        return jsonResponse({ user: mapUser(rows[0]) });
      }

      if (action === "update" && request.method === "PUT") {
        const id = typeof body.id === "string" ? body.id : "";
        if (!id) return jsonResponse({ message: "User ID required" }, 400);

        const rows = await queryRows<UserRow>(
          database,
          `UPDATE enosx_users SET
             display_name = COALESCE($2, display_name),
             ai_personality = COALESCE($3, ai_personality),
             language = COALESCE($4, language),
             notifications = COALESCE($5, notifications),
             compact_mode = COALESCE($6, compact_mode),
             theme = COALESCE($7, theme),
             wallpaper = COALESCE($8, wallpaper),
             updated_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [
            id,
            typeof body.displayName === "string" ? body.displayName.trim() : null,
            typeof body.aiPersonality === "string" ? body.aiPersonality : null,
            typeof body.language === "string" ? body.language : null,
            typeof body.notifications === "boolean" ? body.notifications : null,
            typeof body.compactMode === "boolean" ? body.compactMode : null,
            typeof body.theme === "string" ? body.theme : null,
            typeof body.wallpaper === "string" ? body.wallpaper : null,
          ],
        );

        if (!rows[0]) return jsonResponse({ message: "User not found" }, 404);
        return jsonResponse({ user: mapUser(rows[0]) });
      }

      if (action === "me" && request.method === "GET") {
        const id = url.searchParams.get("id") || "";
        if (!id) return jsonResponse({ message: "User ID required" }, 400);

        const rows = await queryRows<UserRow>(
          database,
          "SELECT * FROM enosx_users WHERE id = $1 LIMIT 1",
          [id],
        );
        if (!rows[0]) return jsonResponse({ message: "User not found" }, 404);
        return jsonResponse({ user: mapUser(rows[0]) });
      }

      return jsonResponse({ message: "Auth route not found" }, 404);
    } catch (error) {
      console.error(`Auth ${action} failed`, error);
      return jsonResponse({ message: action === "signin" ? "Sign in failed" : action === "signup" ? "Sign up failed" : "Authentication request failed" }, 500);
    }
  },
};
