// Per-user storage on Vercel KV (Vercel-native key/value — no external service).
// One key per user: `tracker:<github_login>` -> JSON string of the tracker.
// Uses the Upstash-compatible REST API that Vercel KV injects as env vars
// (KV_REST_API_URL + KV_REST_API_TOKEN) when you attach a KV store to the project.
const URL = process.env.KV_REST_API_URL;
const TOKEN = process.env.KV_REST_API_TOKEN;

export const configured = () => Boolean(URL && TOKEN);

export const emptyTracker = () => ({ start: null, rows: [], milestones: [], goalLossKg: 40 });

// Initial tracker for a user with nothing stored yet — EVERYONE starts empty
// and builds their own history. No seeded/demo data.
export const seedTracker = () => emptyTracker();

async function cmd(args) {
  const r = await fetch(URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  if (!r.ok) throw new Error(`kv ${r.status}: ${await r.text()}`);
  return (await r.json()).result;
}

export async function getTracker(login) {
  const v = await cmd(['GET', `tracker:${login.toLowerCase()}`]);
  if (v == null) return seedTracker(login);
  try {
    return JSON.parse(v);
  } catch {
    return seedTracker(login);
  }
}

export async function saveTracker(login, data) {
  await cmd(['SET', `tracker:${login.toLowerCase()}`, JSON.stringify(data)]);
  return data;
}
