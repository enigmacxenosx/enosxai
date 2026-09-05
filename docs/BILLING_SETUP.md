# ENOSX AI Billing Setup

The implementation uses **Stripe Checkout for recurring subscriptions** and **Paystack for one-time KES credit packs**.

## Plans

| Product | Provider | Price | Access |
|---|---|---:|---|
| EX Core | None | Free | 20 messages per UTC day |
| EX Pro | Stripe | USD 10/month | EX Pro model access and no Core daily limit |
| ENOSH MIND | Stripe | USD 25/month | Highest intelligence tier and no Core daily limit |
| Starter credits | Paystack | KES 500 | 100 credits |
| Builder credits | Paystack | KES 2,000 | 500 credits |
| Power credits | Paystack | KES 5,000 | 1,500 credits |

Authorized GOD MODE commands are exempt from the EX Core daily limit.

## Environment variables

Configure these as server-only Vercel environment variables:

```text
DATABASE_URL=...
PUBLIC_APP_URL=https://your-production-domain.example
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_EX_PRO=price_...
STRIPE_PRICE_ENOSH_MIND=price_...
PAYSTACK_SECRET_KEY=sk_live_...
```

Create the two recurring Stripe Prices in Stripe Dashboard with the exact USD amounts above. The application uses their Price IDs rather than trusting browser-supplied amounts.

## Webhook endpoints

Register these HTTPS endpoints in the provider dashboards:

```text
https://your-production-domain.example/api/billing/webhooks/stripe
https://your-production-domain.example/api/billing/webhooks/paystack
```

For Stripe, subscribe to `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`. For Paystack, enable successful charge/transaction events. Webhook signatures are verified server-side and duplicate event IDs are ignored.

## Database migration

After `DATABASE_URL` is configured, run:

```bash
pnpm exec tsx api-server/src/db/migrate_billing.ts
```

The migration creates provider-neutral tables for customers, subscriptions, credit balances, credit ledger entries, daily usage, and webhook audit events. Do not run paid checkout before the migration has completed.

## Important deployment note

The client only receives hosted checkout URLs. Provider keys, webhook secrets, prices, and amounts remain on the server. Test first with Stripe test keys and Paystack test keys, then configure live credentials in the production environment.
