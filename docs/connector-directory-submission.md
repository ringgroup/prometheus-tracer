# Prometheus Tracer — MCP Connector Directory Submission

Everything needed to submit Prometheus Tracer to Anthropic's connector directory
(claude.ai → Connectors). Copy/paste the fields below into the submission form.

> Where to submit: Anthropic's connector / app directory submission form (see
> support.anthropic.com → "Connectors" or the Anthropic developer/partner pages).
> Remote MCP listings require OAuth, a privacy policy, and terms — all in place
> (checklist at the bottom).

---

## 1. Listing copy

- **Name:** Prometheus Tracer
- **Tagline:** Your body-composition terminal — readings, injections, and trends.
- **Category:** Health & Fitness (Personal data / Productivity)
- **Short description (≤140 chars):**
  Connect your AI to your own Prometheus Tracer data — weigh-ins, body-fat %, muscle, and injection log — read-only.
- **Long description:**
  Prometheus Tracer is a personal body-composition tracker (a Bloomberg-style
  terminal for InBody-style measurements and a self-managed protocol log). This
  connector gives your AI read-only access to *your own* tracker so you can ask
  things like “what’s my body-fat trend?”, “how much have I lost vs. goal?”, or
  “how many days since my last injection?”. You authenticate with your own GitHub
  account; the connector only ever sees your data, and only what you’ve entered.
- **Keywords:** body composition, weight loss, InBody, body fat, fitness tracker, peptides, health
- **Publisher:** Ring Labs LLC (Wyoming, USA) — https://ringlabs.dev

## 2. Technical details

- **Server (MCP) URL:** `https://prometheus-tracer.vercel.app/api/mcp`
- **Transport:** Streamable HTTP (JSON-RPC 2.0)
- **MCP protocol version:** 2025-06-18
- **Authentication:** OAuth 2.1 (Authorization Code + PKCE S256) with Dynamic
  Client Registration. Discovery via:
  - Protected Resource Metadata (RFC 9728): `https://prometheus-tracer.vercel.app/.well-known/oauth-protected-resource`
  - Authorization Server Metadata (RFC 8414): `https://prometheus-tracer.vercel.app/.well-known/oauth-authorization-server`
  - Registration endpoint: `/api/oauth/register` · Authorize: `/api/oauth/authorize` · Token: `/api/oauth/token`
  - The MCP endpoint returns `401` + `WWW-Authenticate: Bearer resource_metadata="…"` when unauthenticated.
- **Scopes:** `read`
- **Writes:** none (read-only).

## 3. Tools exposed (all read-only, no arguments)

| Tool | Description |
|---|---|
| `get_tracker` | Full tracker: all readings + injections, start date, goal. |
| `get_stats` | Computed summary: latest weight, body-fat %, muscle, fat mass, total lost, % of goal, days since last injection. |
| `list_readings` | All InBody measurements (date, day, weight kg, muscle kg, body-fat %). |
| `list_injections` | All logged injections/pins (date, day, peptide, mg). |

Each tool’s `inputSchema` is `{ "type": "object", "properties": {}, "additionalProperties": false }`.

## 4. Data, privacy & security

- **Data accessed:** only the authenticated user’s own tracker entries and GitHub
  profile basics (username, display name, avatar) obtained via GitHub OAuth
  `read:user` scope.
- **Storage:** private per-user objects on Vercel Blob; hosted on Vercel.
  Sub-processors: Vercel (hosting/storage), GitHub (authentication).
- **Isolation:** every request is scoped to the token’s owner; one user can never
  read another’s data.
- **Tokens:** issued per connection, revocable by the user at any time (in-app
  “Connect AI” panel and via the connector settings disconnect).
- **No writes, no selling/sharing data, no model training on user data.**
- **Health disclaimer:** the product is a self-tracking tool, not medical advice.

## 5. Assets & links

- **Logo / icon (512):** `https://prometheus-tracer.vercel.app/logo.png` (also icon-192/512, apple-touch-icon)
- **Homepage:** `https://prometheus-tracer.vercel.app`
- **One-click connect guide:** `https://prometheus-tracer.vercel.app/connect`
- **Privacy Policy:** `https://prometheus-tracer.vercel.app/privacy`
- **Terms of Service:** `https://prometheus-tracer.vercel.app/terms`
- **Publisher site:** `https://ringlabs.dev`

## 6. Contact

- Ring Labs LLC — https://ringlabs.dev

---

## Pre-submission checklist

- [x] Remote MCP server live (Streamable HTTP, protocol 2025-06-18)
- [x] OAuth 2.1 + PKCE + Dynamic Client Registration
- [x] `.well-known` discovery (RFC 8414 + RFC 9728)
- [x] `401 + WWW-Authenticate` challenge on unauthenticated requests (GET & POST)
- [x] Read-only tools with valid JSON Schemas
- [x] Per-user data isolation; revocable tokens
- [x] Privacy Policy + Terms of Service (public URLs)
- [x] Logo / icons (PNG, transparent)
- [x] Publisher entity + contact (Ring Labs LLC · ringlabs.dev)
- [ ] Submit to Anthropic connector directory and respond to review feedback
