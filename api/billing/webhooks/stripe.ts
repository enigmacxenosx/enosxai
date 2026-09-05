import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { db, rawBody } from "../_shared";
import { randomUUID } from "node:crypto";

export const config = { api: { bodyParser: false } };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !webhookSecret) return res.status(503).json({ error: "Stripe webhook is not configured" });
  try {
    const client = new Stripe(secret);
    const event = client.webhooks.constructEvent(rawBody(req), req.headers["stripe-signature"] as string, webhookSecret);
    const database = db();
    const inserted = await database.query(`INSERT INTO enosx_payment_events (id, provider, provider_event_id, event_type, payload) VALUES ($1, 'stripe', $2, $3, $4::jsonb) ON CONFLICT (provider, provider_event_id) DO NOTHING RETURNING id`, [randomUUID(), event.id, event.type, JSON.stringify(event)]);
    if (!inserted[0]) return res.status(200).json({ received: true, duplicate: true });
    if (["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"].includes(event.type)) {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = String(subscription.customer);
      const rows = await database.query("SELECT user_id FROM enosx_billing_customers WHERE stripe_customer_id = $1", [customerId]);
      const userId = (subscription.metadata?.userId || (rows[0] as any)?.user_id) as string | undefined;
      const planKey = subscription.metadata?.planKey || "ex-pro";
      if (userId) {
        await database.query(`INSERT INTO enosx_subscriptions (id, user_id, provider, provider_subscription_id, provider_customer_id, plan_key, status, current_period_start, current_period_end, cancel_at_period_end, raw) VALUES ($1, $2, 'stripe', $3, $4, $5, $6, to_timestamp($7), to_timestamp($8), $9, $10::jsonb) ON CONFLICT (provider_subscription_id) DO UPDATE SET status = EXCLUDED.status, plan_key = EXCLUDED.plan_key, current_period_start = EXCLUDED.current_period_start, current_period_end = EXCLUDED.current_period_end, cancel_at_period_end = EXCLUDED.cancel_at_period_end, raw = EXCLUDED.raw, updated_at = NOW()`, [randomUUID(), userId, subscription.id, customerId, planKey, subscription.status, subscription.start_date, subscription.ended_at || subscription.trial_end || subscription.start_date, Boolean(subscription.cancel_at_period_end), JSON.stringify(subscription)]);
      }
    }
    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error("Stripe webhook error", error);
    return res.status(400).json({ error: error?.message || "Invalid webhook" });
  }
}
