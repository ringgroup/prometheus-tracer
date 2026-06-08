// Per-user storage on Vercel KV (Vercel-native key/value — no external service).
// One key per user: `tracker:<github_login>` -> JSON string of the tracker.
// Uses the Upstash-compatible REST API that Vercel KV injects as env vars
// (KV_REST_API_URL + KV_REST_API_TOKEN) when you attach a KV store to the project.
const URL = process.env.KV_REST_API_URL;
const TOKEN = process.env.KV_REST_API_TOKEN;

export const configured = () => Boolean(URL && TOKEN);

// The owner account is seeded with the original protocol history the first time
// it's read, so @ringgroup keeps the existing dashboard. Everyone else: empty.
const OWNER = 'ringgroup';
const OWNER_SEED = {
  start: '2026-04-14',
  rows: [
    { date: '2026-04-21', day: 7, weight: 154.7, muscle: 49.6, fat: 44.4 },
    { date: '2026-05-02', day: 18, weight: 151.6, muscle: 50.7, fat: 41.9 },
    { date: '2026-05-17', day: 33, weight: 150.3, muscle: 50.2, fat: 42.0 },
    { date: '2026-05-26', day: 42, weight: 146.5, muscle: 50.9, fat: 39.7 },
    { date: '2026-06-08', day: 55, weight: 142.6, muscle: 49.5, fat: 39.6 },
  ],
  milestones: [
    { date: '2026-04-14', day: 0, label: 'Retatrutide 1 mg', peptide: 'Retatrutide', mg: 1 },
    { date: '2026-04-17', day: 3, label: 'Retatrutide 3 mg', peptide: 'Retatrutide', mg: 3 },
    { date: '2026-05-26', day: 42, label: 'Retatrutide 4 mg', peptide: 'Retatrutide', mg: 4 },
  ],
  goalLossKg: 40,
};

export const emptyTracker = () => ({ start: null, rows: [], milestones: [], goalLossKg: 40 });
const seedFor = (login) =>
  login.toLowerCase() === OWNER ? structuredClone(OWNER_SEED) : emptyTracker();

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
  if (v == null) return seedFor(login);
  try {
    return JSON.parse(v);
  } catch {
    return seedFor(login);
  }
}

export async function saveTracker(login, data) {
  await cmd(['SET', `tracker:${login.toLowerCase()}`, JSON.stringify(data)]);
  return data;
}
