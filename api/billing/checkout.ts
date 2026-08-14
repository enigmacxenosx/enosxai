import type { VercelRequest, VercelResponse } from "@vercel/node";

const PLANS = new Set(["pro"]);

/**
 * Keeps provider checkout URLs server-side. Configure BILLING_CHECKOUT_URL_PRO
 * to a hosted Stripe, M-Pesa, Paddle, or other provider checkout page.
 */
export default function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== "GET") {
    return response.status(405).json({ error: "Method not allowed" });
  }

  const plan = Array.isArray(request.query.plan) ? request.query.plan[0] : request.query.plan;
  if (!plan || !PLANS.has(plan)) {
    return response.status(400).json({ error: "Unsupported plan" });
  }

  const checkoutUrl = process.env.BILLING_CHECKOUT_URL_PRO;
  if (!checkoutUrl) {
    return response.status(503).json({ error: "Billing has not been configured" });
  }

  try {
    const url = new URL(checkoutUrl);
    if (url.protocol !== "https:") throw new Error("Checkout must use HTTPS");
    return response.status(200).json({ checkoutUrl: url.toString() });
  } catch {
    return response.status(500).json({ error: "Billing checkout configuration is invalid" });
  }
}
