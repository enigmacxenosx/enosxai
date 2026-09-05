import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { CREDIT_PACKS, PLANS, appUrl, db, getUserId, userExists } from "./_shared";

function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST" && req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const plan = String(body.plan || req.query.plan || "") as keyof typeof PLANS;
    const userId = getUserId(body, req.query);
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
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl()}/?billing=success`,
      cancel_url: `${appUrl()}/?billing=cancelled`,
      allow_promotion_codes: true,
      subscription_data: { metadata: { userId, planKey: plan } },
      metadata: { userId, planKey: plan },
    });
    return res.status(200).json({ checkoutUrl: session.url });
  } catch (error: any) {
    console.error("Stripe checkout error", error);
    return res.status(500).json({ error: error?.message || "Unable to create checkout" });
  }
}

export async function paystackHandler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
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
  } catch (error: any) {
    console.error("Paystack initialization error", error);
    return res.status(500).json({ error: error?.message || "Unable to create Paystack checkout" });
  }
}
