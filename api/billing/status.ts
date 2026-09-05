import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db, getEntitlement, getUserId, userExists } from "./_shared";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const userId = getUserId({}, req.query);
  if (!userId) return res.status(400).json({ error: "userId is required" });
  try {
    if (!(await userExists(userId))) return res.status(401).json({ error: "Unknown user" });
    const [entitlement, credits, usage] = await Promise.all([
      getEntitlement(userId),
      db().query("SELECT balance FROM enosx_credit_balances WHERE user_id = $1", [userId]),
      db().query("SELECT message_count FROM enosx_daily_usage WHERE user_id = $1 AND usage_date = CURRENT_DATE", [userId]),
    ]);
    return res.json({ plan: entitlement?.plan_key || "ex-core", subscriptionStatus: entitlement?.status || "none", credits: Number((credits[0] as any)?.balance || 0), dailyMessagesUsed: Number((usage[0] as any)?.message_count || 0), dailyMessagesLimit: entitlement ? null : 20 });
  } catch (error) {
    console.error("Billing status error", error);
    return res.status(500).json({ error: "Unable to load billing status" });
  }
}
