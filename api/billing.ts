import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import {
  CREDIT_PACKS, PLANS, addCredits, appUrl, db, getEntitlement, getUserId,
  rawBody, userExists,
} from "../lib/billing";

export const config = { api: { bodyParser: false } };

function jsonBody(req: VercelRequest) {
  return typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
}
function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key);
}
async function checkout(req: VercelRequest, res: VercelResponse) {
  const body = jsonBody(req);
  const plan = String(body.plan || "") as keyof typeof PLANS;
  const userId = getUserId(body);
  if (!userId || !Object.prototype.hasOwnProperty.call(PLANS, plan)) return res.status(400).json({ error: "A valid userId and plan are required" });
  const user = await userExists(userId);
  if (!user) return res.status(401).json({ error: "Sign in before starting checkout" });
  const priceId = process.env[PLANS[plan].priceEnv];
  if (!priceId) return res.status(503).json({ error: `${PLANS[plan].name} price is not configured` });
  const database = db();
  const existing = await database.query("SELECT stripe_customer_id FROM enosx_billing_customers WHERE user_id = $1", [userId]);
  let customerId = (existing[0] as any)?.stripe_customer_id as string | undefined;
  const client = stripe();
  if (!customerId) {
    const customer = await client.customers.create({ email: user.email, name: user.display_name || undefined, metadata: { userId } });
    customerId = customer.id;
    await database.query(`INSERT INTO enosx_billing_customers (user_id, stripe_customer_id) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET stripe_customer_id = EXCLUDED.stripe_customer_id, updated_at = NOW()`, [userId, customerId]);
  }
  const session = await client.checkout.sessions.create({
    mode: "subscription", customer: customerId, line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl()}/?billing=success`, cancel_url: `${appUrl()}/?billing=cancelled`,
    allow_promotion_codes: true,
    subscription_data: { metadata: { userId, planKey: plan } }, metadata: { userId, planKey: plan },
  });
  return res.status(200).json({ checkoutUrl: session.url });
}
async function paystackInitialize(req: VercelRequest, res: VercelResponse) {
  const body = jsonBody(req);
  const pack = String(body.pack || "") as keyof typeof CREDIT_PACKS;
  const userId = getUserId(body);
  const user = userId ? await userExists(userId) : undefined;
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret || !user || !Object.prototype.hasOwnProperty.call(CREDIT_PACKS, pack)) return res.status(400).json({ error: "Paystack, a valid userId, and a valid pack are required" });
  const selected = CREDIT_PACKS[pack];
  const response = await fetch("https://api.paystack.co/transaction/initialize", { method: "POST", headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" }, body: JSON.stringify({ email: user.email, amount: selected.amountKobo, currency: "KES", callback_url: `${appUrl()}/?billing=paystack-success`, metadata: { userId, packKey: pack, credits: selected.credits } }) });
  const payload: any = await response.json();
  if (!response.ok || !payload.status) return res.status(502).json({ error: payload.message || "Paystack initialization failed" });
  return res.status(200).json({ checkoutUrl: payload.data.authorization_url, reference: payload.data.reference });
}
async function status(req: VercelRequest, res: VercelResponse) {
  const userId = getUserId({}, req.query);
  if (!userId) return res.status(400).json({ error: "userId is required" });
  if (!(await userExists(userId))) return res.status(401).json({ error: "Unknown user" });
  const [entitlement, credits, usage] = await Promise.all([
    getEntitlement(userId),
    db().query("SELECT balance FROM enosx_credit_balances WHERE user_id = $1", [userId]),
    db().query("SELECT message_count FROM enosx_daily_usage WHERE user_id = $1 AND usage_date = CURRENT_DATE", [userId]),
  ]);
  return res.json({ plan: entitlement?.plan_key || "ex-core", subscriptionStatus: entitlement?.status || "none", credits: Number((credits[0] as any)?.balance || 0), dailyMessagesUsed: Number((usage[0] as any)?.message_count || 0), dailyMessagesLimit: entitlement ? null : 20 });
}
async function stripeWebhook(req: VercelRequest, res: VercelResponse) {
  const secret = process.env.STRIPE_SECRET_KEY, webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !webhookSecret) return res.status(503).json({ error: "Stripe webhook is not configured" });
  const event = stripe().webhooks.constructEvent(rawBody(req), req.headers["stripe-signature"] as string, webhookSecret);
  const database = db();
  const inserted = await database.query(`INSERT INTO enosx_payment_events (id, provider, provider_event_id, event_type, payload) VALUES ($1, 'stripe', $2, $3, $4::jsonb) ON CONFLICT (provider, provider_event_id) DO NOTHING RETURNING id`, [randomUUID(), event.id, event.type, JSON.stringify(event)]);
  if (!inserted[0]) return res.status(200).json({ received: true, duplicate: true });
  if (["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"].includes(event.type)) {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = String(subscription.customer);
    const rows = await database.query("SELECT user_id FROM enosx_billing_customers WHERE stripe_customer_id = $1", [customerId]);
    const userId = (subscription.metadata?.userId || (rows[0] as any)?.user_id) as string | undefined;
    if (userId) await database.query(`INSERT INTO enosx_subscriptions (id, user_id, provider, provider_subscription_id, provider_customer_id, plan_key, status, current_period_start, current_period_end, cancel_at_period_end, raw) VALUES ($1, $2, 'stripe', $3, $4, $5, $6, to_timestamp($7), to_timestamp($8), $9, $10::jsonb) ON CONFLICT (provider_subscription_id) DO UPDATE SET status = EXCLUDED.status, plan_key = EXCLUDED.plan_key, current_period_start = EXCLUDED.current_period_start, current_period_end = EXCLUDED.current_period_end, cancel_at_period_end = EXCLUDED.cancel_at_period_end, raw = EXCLUDED.raw, updated_at = NOW()`, [randomUUID(), userId, subscription.id, customerId, subscription.metadata?.planKey || "ex-pro", subscription.status, subscription.start_date, subscription.ended_at || subscription.trial_end || subscription.start_date, Boolean(subscription.cancel_at_period_end), JSON.stringify(subscription)]);
  }
  return res.status(200).json({ received: true });
}
async function paystackWebhook(req: VercelRequest, res: VercelResponse) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return res.status(503).json({ error: "Paystack webhook is not configured" });
  const payload = rawBody(req), signature = String(req.headers["x-paystack-signature"] || ""), expected = createHmac("sha512", secret).update(payload).digest("hex");
  if (!signature || signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return res.status(401).json({ error: "Invalid signature" });
  const event: any = JSON.parse(payload.toString("utf8")), eventId = String(event.data?.id || event.data?.reference || randomUUID()), database = db();
  const inserted = await database.query(`INSERT INTO enosx_payment_events (id, provider, provider_event_id, event_type, payload) VALUES ($1, 'paystack', $2, $3, $4::jsonb) ON CONFLICT (provider, provider_event_id) DO NOTHING RETURNING id`, [randomUUID(), eventId, event.event || "unknown", JSON.stringify(event)]);
  if (!inserted[0]) return res.status(200).json({ received: true, duplicate: true });
  const metadata = event.data?.metadata || {}, pack = metadata.packKey as keyof typeof CREDIT_PACKS;
  if ((event.event === "charge.success" || event.event === "transaction.success") && metadata.userId && CREDIT_PACKS[pack]) await addCredits(metadata.userId, CREDIT_PACKS[pack].credits, "paystack", eventId, CREDIT_PACKS[pack].name, { reference: event.data?.reference, packKey: pack });
  return res.status(200).json({ received: true });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") return res.status(200).end();
  try {
    const route = String(req.query.route || "");
    if (route === "checkout") return req.method === "POST" ? checkout(req, res) : res.status(405).json({ error: "Method not allowed" });
    if (route === "paystack-initialize") return req.method === "POST" ? paystackInitialize(req, res) : res.status(405).json({ error: "Method not allowed" });
    if (route === "status") return req.method === "GET" ? status(req, res) : res.status(405).json({ error: "Method not allowed" });
    if (route === "stripe-webhook") return req.method === "POST" ? stripeWebhook(req, res) : res.status(405).end();
    if (route === "paystack-webhook") return req.method === "POST" ? paystackWebhook(req, res) : res.status(405).end();
    return res.status(404).json({ error: "Unknown billing route" });
  } catch (error: any) {
    console.error("Billing error", error);
    return res.status(500).json({ error: error?.message || "Billing request failed" });
  }
}
