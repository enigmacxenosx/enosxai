/** Create ENOSX billing tables in Neon. Run with: pnpm exec tsx api-server/src/db/migrate_billing.ts */
import { neon } from "@neondatabase/serverless";

const sql = process.env.DATABASE_URL;
if (!sql) throw new Error("DATABASE_URL is required");
const db = neon(sql);

async function migrate() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS enosx_billing_customers (
      user_id TEXT PRIMARY KEY REFERENCES enosx_users(id) ON DELETE CASCADE,
      stripe_customer_id TEXT UNIQUE,
      paystack_customer_code TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS enosx_subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES enosx_users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL CHECK (provider IN ('stripe')),
      provider_subscription_id TEXT NOT NULL UNIQUE,
      provider_customer_id TEXT,
      plan_key TEXT NOT NULL CHECK (plan_key IN ('ex-pro', 'enosh-mind')),
      status TEXT NOT NULL,
      current_period_start TIMESTAMPTZ,
      current_period_end TIMESTAMPTZ,
      cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
      raw JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS enosx_subscriptions_user_idx ON enosx_subscriptions(user_id);
    CREATE TABLE IF NOT EXISTS enosx_credit_balances (
      user_id TEXT PRIMARY KEY REFERENCES enosx_users(id) ON DELETE CASCADE,
      balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS enosx_credit_transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES enosx_users(id) ON DELETE CASCADE,
      delta INTEGER NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('purchase', 'usage', 'refund', 'admin', 'migration')),
      provider TEXT,
      provider_event_id TEXT,
      description TEXT,
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(provider, provider_event_id)
    );
    CREATE INDEX IF NOT EXISTS enosx_credit_transactions_user_idx ON enosx_credit_transactions(user_id, created_at DESC);
    CREATE TABLE IF NOT EXISTS enosx_daily_usage (
      user_id TEXT NOT NULL REFERENCES enosx_users(id) ON DELETE CASCADE,
      usage_date DATE NOT NULL,
      message_count INTEGER NOT NULL DEFAULT 0 CHECK (message_count >= 0),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, usage_date)
    );
    CREATE TABLE IF NOT EXISTS enosx_payment_events (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL CHECK (provider IN ('stripe', 'paystack')),
      provider_event_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      payload JSONB NOT NULL,
      processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(provider, provider_event_id)
    );
  `);
  console.log("Billing migration complete");
}

migrate().catch((error) => { console.error(error); process.exit(1); });
