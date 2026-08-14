/**
 * Migration script to create chat history tables in Neon.
 */
import { neon } from "@neondatabase/serverless";

async function migrate() {
  const neonUrl = process.env.DATABASE_URL;
  if (!neonUrl) {
    console.error("DATABASE_URL not configured");
    process.exit(1);
  }

  const db = neon(neonUrl);

  console.log("Creating enosx_chats table...");
  await db.query(`
    CREATE TABLE IF NOT EXISTS enosx_chats (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES enosx_users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  console.log("Creating enosx_messages table...");
  await db.query(`
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

  console.log("Migration complete!");
}

migrate().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
