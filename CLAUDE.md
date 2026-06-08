# CLAUDE.md — Prometheus Tracer

Handover context for Claude Code working in this repo.

## What this is
A single-page, Bloomberg/TradingView-style terminal that tracks body-composition
over a retatrutide protocol, built from InBody-770 scale readings. No build step,
no framework. The dashboard is gated behind **Sign in with GitHub** (raw GitHub
OAuth on Vercel serverless functions), and the health numbers are served only to
an authenticated session — they are no longer embedded in the public HTML.

## Repo layout
```
index.html       # the app shell: login gate + dashboard markup/CSS/JS
api/_lib.mjs     # shared auth helpers (HMAC-signed cookie, allow-list, etc.)
api/login.mjs    # GET /api/login    -> redirect to GitHub OAuth
api/callback.mjs # GET /api/callback -> exchange code, set session cookie
api/me.mjs       # GET /api/me       -> { authenticated, login, name, avatar }
api/logout.mjs   # GET /api/logout   -> clear cookie
api/data.mjs     # GET /api/data     -> body-comp DATA (401 unless signed in)
vercel.json      # static hosting config (cleanUrls, security header)
deploy.sh        # git init -> create public GitHub repo -> push -> vercel --prod
.env.example     # the env vars the serverless functions need
README.md        # user-facing overview
CLAUDE.md        # this file
```
The body-comp `DATA` object now lives **server-side** in `api/data.mjs` (returned
only to an authenticated GitHub session) — it is intentionally NOT in the public
`index.html` anymore. To add a reading, append a row there. The raw
`measurements.json`, InBody photos, and companion Python MCP server still live
OUTSIDE this repo in the parent `Weight Loss Tracker/` folder.

## Auth (GitHub OAuth)
Serverless functions implement the OAuth code flow directly — no auth library.
Session = an HttpOnly, Secure, SameSite=Lax cookie (`pt_session`) holding a
JSON payload signed with HMAC-SHA256 (`SESSION_SECRET`). Access is restricted by
`ALLOWED_GITHUB_USERS` (comma-separated logins; empty = any GitHub user).
Required Vercel env vars: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`,
`SESSION_SECRET`, `ALLOWED_GITHUB_USERS` (see `.env.example`). The GitHub OAuth
App's callback URL must be `https://<domain>/api/callback`.

## Tech stack
- Vanilla HTML/CSS/JS. Monospace Bloomberg aesthetic (amber `#ff8c00`, black bg).
- Chart.js 4.4.1 via cdnjs (the only external dependency).
- No localStorage / no network calls beyond the Chart.js CDN.

## Data model (`DATA` in index.html)
```js
DATA = {
  start: "YYYY-MM-DD",                 // day 0 = first injection
  rows: [ { date, day, weight, muscle, fat /* body fat % */ } ],
  milestones: [ { date, day, label } ] // dose changes etc.
}
```
Derived per row at runtime:
- `fatMass = weight * fat / 100`
- `lost = BASELINE - weight`  where `BASELINE = DATA.rows[0].weight`
- `GOAL = 40` (kg target loss)

## How the UI is built
Two stacked Chart.js line charts sharing a linear x-axis (`day`):
- **chartTop** — Weight (left `kg` axis) + Body Fat % (right `pct` axis, featured).
  Weight line fills down to a dashed BASELINE reference (`baselinePlugin`),
  shading the total-weight-lost band. No separate "total lost" line (redundant).
- **chartBot** — Fat Mass + Muscle, MACD-style subplot. Has a transparent
  `ghost` right axis purely to stay horizontally aligned with chartTop's % axis.

Custom Chart.js plugins: `crosshair`, `milestones` (vertical dashed markers),
`baselinePlugin` (baseline line + label, chartTop only).

Controls (`SERIES` maps a button key -> `[chart, datasetIndex]`):
- keys/buttons **1–4**: toggle Weight / Fat Mass / Muscle / Body Fat %.
- **VIEW** ALL vs BODY FAT (isolates the % line, hides the subplot).
- **X-AXIS** DAY vs DATE (`xMode`, re-renders tick labels).
- **M**: toggle milestone markers.
- `upd(i)` refreshes the right-hand DATA WINDOW + goal progress bar on hover.

## Common tasks
- **Add a reading**: append a row to `DATA.rows` in `index.html`
  (`{date, day, weight, muscle, fat}`); everything else is derived. If you also
  keep the parent `measurements.json` / MCP in sync, add the matching row there.
- **Change the goal**: edit `GOAL` in the script (and `goal_loss_kg` in the
  parent measurements.json if used).
- **Restyle**: CSS variables are in `:root` at the top of `index.html`.

## Deploy
Static site. Either `vercel --prod` from this folder, or connect the GitHub repo
in the Vercel dashboard (git integration auto-deploys on push). `bash deploy.sh`
chains GitHub create + push + Vercel deploy (needs `gh` and `vercel` CLIs logged in).

## Gotchas
- Keep it a **single file** — data is embedded on purpose so the page is portable.
- The two panels align via the `ghost` axis on chartBot; if you change the top
  chart's right axis, re-check alignment.
- This is **personal health data** and the site is public — don't add names or
  identifying info to the embedded data.
