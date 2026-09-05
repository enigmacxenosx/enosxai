import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { CREDIT_PACKS, addCredits, db, rawBody } from "../_shared";

export const config = { api: { bodyParser: false } };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return res.status(503).json({ error: "Paystack webhook is not configured" });
  const payload = rawBody(req);
  const signature = String(req.headers["x-paystack-signature"] || "");
  const expected = createHmac("sha512", secret).update(payload).digest("hex");
  if (!signature || signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return res.status(401).json({ error: "Invalid signature" });
  try {
    const event: any = JSON.parse(payload.toString("utf8"));
    const database = db();
    const eventId = String(event.data?.id || event.data?.reference || randomUUID());
    const inserted = await database.query(`INSERT INTO enosx_payment_events (id, provider, provider_event_id, event_type, payload) VALUES ($1, 'paystack', $2, $3, $4::jsonb) ON CONFLICT (provider, provider_event_id) DO NOTHING RETURNING id`, [randomUUID(), eventId, event.event || "unknown", JSON.stringify(event)]);
    if (!inserted[0]) return res.status(200).json({ received: true, duplicate: true });
    if (event.event === "charge.success" || event.event === "transaction.success") {
      const metadata = event.data?.metadata || {};
      const userId = metadata.userId;
      const pack = metadata.packKey as keyof typeof CREDIT_PACKS;
      if (userId && CREDIT_PACKS[pack]) await addCredits(userId, CREDIT_PACKS[pack].credits, "paystack", eventId, CREDIT_PACKS[pack].name, { reference: event.data?.reference, packKey: pack });
    }
    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error("Paystack webhook error", error);
    return res.status(400).json({ error: error?.message || "Invalid webhook" });
  }
}
