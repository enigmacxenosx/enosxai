import { neon } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";

export type PlanKey = "ex-pro" | "enosh-mind";
export const PLANS: Record<PlanKey, { name: string; amountUsd: number; priceEnv: string }> = {
  "ex-pro": { name: "EX Pro", amountUsd: 10, priceEnv: "STRIPE_PRICE_EX_PRO" },
  "enosh-mind": { name: "ENOSH MIND", amountUsd: 25, priceEnv: "STRIPE_PRICE_ENOSH_MIND" },
};
export const CREDIT_PACKS = {
  starter: { name: "Starter credits", credits: 100, amountKobo: 50000 },
  builder: { name: "Builder credits", credits: 500, amountKobo: 200000 },
  power: { name: "Power credits", credits: 1500, amountKobo: 500000 },
} as const;

export function db() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");
  return neon(url);
}

export function appUrl() {
  return (process.env.PUBLIC_APP_URL || "https://enosxtechnologies450.vercel.app").replace(/\/$/, "");
}

export function getUserId(body: any, query?: any) {
  const raw = body?.userId ?? query?.userId;
  return typeof raw === "string" && raw.length > 0 && raw.length < 200 ? raw : null;
}

export async function userExists(userId: string) {
  // Database-backed accounts and usage limits are optional for EX Core. When
  // the deployment has not provisioned DATABASE_URL yet, treat the request as
  // an unknown user so free core chat can continue instead of failing with a
  // configuration error. Paid tiers still fail closed in /api/chat because
  // they require a persisted entitlement.
  if (!process.env.DATABASE_URL?.trim()) return undefined;
  const rows = await db().query("SELECT id, email, display_name FROM enosx_users WHERE id = $1", [userId]);
  return rows[0] as any | undefined;
}

export async function getEntitlement(userId: string) {
  const rows = await db().query(`
    SELECT s.plan_key, s.status, s.current_period_end
    FROM enosx_subscriptions s
    WHERE s.user_id = $1 AND s.status IN ('active', 'trialing', 'past_due')
    ORDER BY CASE WHEN s.plan_key = 'enosh-mind' THEN 0 ELSE 1 END, s.updated_at DESC LIMIT 1
  `, [userId]);
  return rows[0] as any | undefined;
}

export async function consumeCoreMessage(userId: string) {
  const rows = await db().query(`
    INSERT INTO enosx_daily_usage (user_id, usage_date, message_count)
    VALUES ($1, CURRENT_DATE, 1)
    ON CONFLICT (user_id, usage_date) DO UPDATE SET message_count = enosx_daily_usage.message_count + 1, updated_at = NOW()
    RETURNING message_count
  `, [userId]);
  const count = Number((rows[0] as any)?.message_count || 0);
  if (count > 20) {
    await db().query("UPDATE enosx_daily_usage SET message_count = message_count - 1 WHERE user_id = $1 AND usage_date = CURRENT_DATE", [userId]);
    return { allowed: false, used: 20, remaining: 0 };
  }
  return { allowed: true, used: count, remaining: 20 - count };
}

export async function spendCredit(userId: string) {
  const database = db();
  const rows = await database.query(`
    UPDATE enosx_credit_balances SET balance = balance - 1, updated_at = NOW()
    WHERE user_id = $1 AND balance > 0 RETURNING balance
  `, [userId]);
  if (!rows[0]) return false;
  await database.query(`
    INSERT INTO enosx_credit_transactions (id, user_id, delta, kind, description)
    VALUES ($1, $2, -1, 'usage', 'EX Core message after daily allowance')
  `, [randomUUID(), userId]);
  return true;
}

export async function addCredits(userId: string, credits: number, provider: string, eventId: string, description: string, metadata: any = {}) {
  const database = db();
  const txId = randomUUID();
  const inserted = await database.query(`
    INSERT INTO enosx_credit_transactions (id, user_id, delta, kind, provider, provider_event_id, description, metadata)
    VALUES ($1, $2, $3, 'purchase', $4, $5, $6, $7::jsonb)
    ON CONFLICT (provider, provider_event_id) DO NOTHING RETURNING id
  `, [txId, userId, credits, provider, eventId, description, JSON.stringify(metadata)]);
  if (!inserted[0]) return false;
  await database.query(`
    INSERT INTO enosx_credit_balances (user_id, balance) VALUES ($1, $2)
    ON CONFLICT (user_id) DO UPDATE SET balance = enosx_credit_balances.balance + EXCLUDED.balance, updated_at = NOW()
  `, [userId, credits]);
  return true;
}

export function rawBody(req: any) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === "string") return Buffer.from(req.body);
  return Buffer.from(JSON.stringify(req.body || {}));
}
