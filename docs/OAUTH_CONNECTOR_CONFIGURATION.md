# Connector OAuth configuration

The API server keeps connector client secrets server-side. Set these variables in the API deployment environment; do not expose client secrets in Vite variables or commit them.

| Connector | Required variables | Redirect URI |
|---|---|---|
| GitHub | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_OAUTH_STATE_SECRET` | `${GITHUB_OAUTH_REDIRECT_ORIGIN}/api/connectors/github/oauth/callback` |
| Vercel | `VERCEL_OAUTH_CLIENT_ID`, `VERCEL_OAUTH_CLIENT_SECRET`, `CONNECTOR_OAUTH_STATE_SECRET` | `${VERCEL_OAUTH_REDIRECT_ORIGIN}/api/connectors/vercel/oauth/callback` |
| Shopify | `SHOPIFY_OAUTH_CLIENT_ID`, `SHOPIFY_OAUTH_CLIENT_SECRET`, `CONNECTOR_OAUTH_STATE_SECRET` | `${SHOPIFY_OAUTH_REDIRECT_ORIGIN}/api/connectors/shopify/oauth/callback` |
| Email (Google) | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `CONNECTOR_OAUTH_STATE_SECRET` | `${GOOGLE_OAUTH_REDIRECT_ORIGIN}/api/connectors/email/oauth/callback` |

Each provider's redirect URI must be registered exactly, including scheme, hostname, path, and trailing slash behavior. Shopify additionally requires the user to enter a `*.myshopify.com` shop domain and uses `SHOPIFY_OAUTH_SCOPES` (default: `read_products`).

The frontend opens the corresponding start endpoint in a popup. The callback validates a signed, time-limited state value, exchanges the authorization code server-side, looks up the provider profile, and sends the account to the opener with `postMessage` constrained to `window.location.origin`.
