# ENOSX AI Billing Schema

## Billing rules

- **EX Core** is free and limited to 20 user messages per UTC day.
- **EX Pro** is a Stripe subscription at **USD 10/month**.
- **ENOSH MIND** is a Stripe subscription at **USD 25/month**.
- **Credit packs** are one-time Paystack purchases settled in **KES**.
- Paid subscriptions bypass the EX Core daily limit. After the 20 free daily EX Core messages, one purchased credit unlocks one additional EX Core message.
- An authorized **GOD MODE** command is exempt from credit consumption and the EX Core daily limit.

## Tables

### `enosx_billing_customers`

One row per ENOSX user and provider customer identity. The provider columns are nullable because a user may use subscriptions, packs, or both.

### `enosx_subscriptions`

Provider-neutral subscription records. A unique provider subscription ID makes webhook delivery idempotent. `status` mirrors the provider state and `plan_key` is always one of `ex-pro` or `enosh-mind`.

### `enosx_credit_balances`

One row per user with the current integer credit balance. Updates must be performed atomically with `GREATEST(0, balance + delta)`.

### `enosx_credit_transactions`

Immutable ledger for grants, purchases, usage, refunds, and administrative adjustments. `provider_event_id` is unique when present, preventing duplicate webhook grants.

### `enosx_daily_usage`

One row per user and UTC date. The unique `(user_id, usage_date)` key allows an atomic upsert for the 20-message EX Core limit.

### `enosx_payment_events`

Raw provider event IDs and payloads for auditability and idempotent webhook processing. Provider event IDs are unique per provider.

## Provider configuration

Stripe price IDs and Paystack pack definitions remain environment configuration; no secret is stored in the client or repository. The application accepts:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_EX_PRO`
- `STRIPE_PRICE_ENOSH_MIND`
- `PAYSTACK_SECRET_KEY`
- `PAYSTACK_WEBHOOK_SECRET`
- `PUBLIC_APP_URL`

The migration is in `api-server/src/db/migrate_billing.ts`.
