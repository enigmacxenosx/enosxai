/**
 * ENOSX AI — /api/history (Vercel Serverless Function)
 * Persists authenticated users' conversations in Neon/Postgres.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { neon } from "@neondatabase/serverless";

let schemaPromise: Promise<void> | null = null;

function getDb() {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) throw new Error("DATABASE_URL is not configured");
  return neon(databaseUrl);
}

async function ensureSchema() {
  if (!schemaPromise) {
    const sql = getDb();
    schemaPromise = (async () => {
      await sql`CREATE TABLE IF NOT EXISTS enosx_chats (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS enosx_messages (
        id TEXT PRIMARY KEY,
        chat_id TEXT REFERENCES enosx_chats(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        attachments JSONB,
        proposed_actions JSONB,
        timestamp TIMESTAMPTZ DEFAULT NOW()
      )`;
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  await schemaPromise;
}

function setHeaders(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");
}

function parseBody(req: VercelRequest) {
  if (typeof req.body === "string") return JSON.parse(req.body);
  return req.body || {};
}

function getUserId(req: VercelRequest) {
  const value = Array.isArray(req.query.userId) ? req.query.userId[0] : req.query.userId;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setHeaders(res);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (!["GET", "POST", "DELETE"].includes(req.method || "")) {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await ensureSchema();
    const sql = getDb();

    if (req.method === "GET") {
      const userId = getUserId(req);
      if (!userId) return res.status(400).json({ error: "User ID required" });

      const chats = await sql`SELECT id, title, created_at, updated_at
        FROM enosx_chats
        WHERE user_id = ${userId}
        ORDER BY updated_at DESC`;

      const history = await Promise.all(chats.map(async (chat: any) => {
        const messages = await sql`SELECT id, role, content, attachments, proposed_actions, timestamp
          FROM enosx_messages
          WHERE chat_id = ${chat.id}
          ORDER BY timestamp ASC`;

        return {
          id: chat.id,
          title: chat.title,
          createdAt: chat.created_at,
          updatedAt: chat.updated_at,
          messages: messages.map((message: any) => ({
            id: message.id,
            role: message.role,
            content: message.content,
            timestamp: message.timestamp,
            attachments: message.attachments || undefined,
            proposedActions: message.proposed_actions || undefined,
          })),
        };
      }));

      return res.status(200).json({ history });
    }

    if (req.method === "POST") {
      const body = parseBody(req);
      const userId = typeof body.userId === "string" ? body.userId.trim() : "";
      const chat = body.chat;
      if (!userId || !chat || typeof chat.id !== "string" || !Array.isArray(chat.messages)) {
        return res.status(400).json({ error: "User ID and valid chat data are required" });
      }

      await sql`INSERT INTO enosx_chats (id, user_id, title, updated_at)
        VALUES (${chat.id}, ${userId}, ${String(chat.title || "New Chat")}, NOW())
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          updated_at = NOW()`;

      for (const message of chat.messages) {
        if (!message || typeof message.id !== "string" || typeof message.role !== "string") continue;
        await sql`INSERT INTO enosx_messages
          (id, chat_id, role, content, attachments, proposed_actions, timestamp)
          VALUES (
            ${message.id},
            ${chat.id},
            ${message.role},
            ${String(message.content || "")},
            ${JSON.stringify(message.attachments || [])}::jsonb,
            ${JSON.stringify(message.proposedActions || [])}::jsonb,
            ${message.timestamp || new Date().toISOString()}
          )
          ON CONFLICT (id) DO UPDATE SET
            content = EXCLUDED.content,
            attachments = EXCLUDED.attachments,
            proposed_actions = EXCLUDED.proposed_actions`;
      }

      return res.status(200).json({ success: true });
    }

    const userId = getUserId(req);
    const chatId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
    if (!userId || typeof chatId !== "string" || !chatId.trim()) {
      return res.status(400).json({ error: "User ID and chat ID required" });
    }

    const deleted = await sql`DELETE FROM enosx_chats
      WHERE id = ${chatId} AND user_id = ${userId}
      RETURNING id`;
    return res.status(200).json({ success: true, deleted: deleted.length > 0 });
  } catch (error) {
    console.error("[API] History error:", error);
    return res.status(500).json({ error: "Failed to persist chat history" });
  }
}
