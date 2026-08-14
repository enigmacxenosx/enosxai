/**
 * History routes — Chat history management.
 * Integrates with Neon (PostgreSQL).
 */
import { Router, Request, Response } from "express";

const router = Router();

async function queryNeon(sql: string, params: any[] = []) {
  const neonUrl = process.env.DATABASE_URL;
  if (!neonUrl) throw new Error("DATABASE_URL not configured");
  
  try {
    const { neon } = await import("@neondatabase/serverless");
    const db = neon(neonUrl);
    return await db.query(sql, params);
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

async function ensureHistoryTables() {
  try {
    await queryNeon(`
      CREATE TABLE IF NOT EXISTS enosx_chats (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await queryNeon(`
      CREATE TABLE IF NOT EXISTS enosx_messages (
        id TEXT PRIMARY KEY,
        chat_id TEXT REFERENCES enosx_chats(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        attachments JSONB,
        proposed_actions JSONB,
        timestamp TIMESTAMPTZ DEFAULT NOW()
      )
    `);
  } catch (err) {
    console.warn("Could not ensure history tables:", err);
  }
}

ensureHistoryTables().catch(console.warn);

// ── GET /history ──────────────────────────────────────────────────────────────
router.get("/history", async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      res.status(400).json({ message: "User ID required" });
      return;
    }
    const chats = await queryNeon(
      "SELECT * FROM enosx_chats WHERE user_id = $1 ORDER BY updated_at DESC",
      [userId]
    );
    
    const fullHistory = await Promise.all(chats.map(async (chat: any) => {
      const messages = await queryNeon(
        "SELECT * FROM enosx_messages WHERE chat_id = $1 ORDER BY timestamp ASC",
        [chat.id]
      );
      return {
        ...chat,
        messages: messages.map((m: any) => ({
          ...m,
          attachments: typeof m.attachments === 'string' ? JSON.parse(m.attachments) : m.attachments,
          proposedActions: typeof m.proposed_actions === 'string' ? JSON.parse(m.proposed_actions) : m.proposed_actions
        }))
      };
    }));
    
    res.json({ history: fullHistory });
  } catch (err) {
    console.error("Get history error:", err);
    res.status(500).json({ message: "Failed to get history" });
  }
});

// ── POST /history ─────────────────────────────────────────────────────────────
router.post("/history", async (req: Request, res: Response) => {
  try {
    const { userId, chat } = req.body;
    if (!userId || !chat) {
      res.status(400).json({ message: "User ID and Chat data required" });
      return;
    }

    // Upsert chat
    await queryNeon(
      `INSERT INTO enosx_chats (id, user_id, title, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         updated_at = NOW()`,
      [chat.id, userId, chat.title]
    );

    // Batch upsert messages (simple implementation)
    for (const msg of chat.messages) {
      await queryNeon(
        `INSERT INTO enosx_messages (id, chat_id, role, content, attachments, proposed_actions, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET
           content = EXCLUDED.content,
           attachments = EXCLUDED.attachments,
           proposed_actions = EXCLUDED.proposed_actions`,
        [
          msg.id, 
          chat.id, 
          msg.role, 
          msg.content, 
          JSON.stringify(msg.attachments || []), 
          JSON.stringify(msg.proposedActions || []),
          msg.timestamp || new Date()
        ]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Save history error:", err);
    res.status(500).json({ message: "Failed to save history" });
  }
});

// ── DELETE /history/:id ───────────────────────────────────────────────────────
router.delete("/history/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await queryNeon("DELETE FROM enosx_chats WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    console.error("Delete history error:", err);
    res.status(500).json({ message: "Failed to delete history" });
  }
});

export default router;
