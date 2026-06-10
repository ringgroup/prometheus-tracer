// Read-only "capability URL" feed — the zero-interaction way to share a tracker
// with any AI. GET /api/feed?key=<token> -> JSON; &format=md -> Markdown summary.
// Auth = the same revocable per-user token (also accepts Authorization: Bearer).
// No OAuth, no connector, works with anything that can fetch a URL.
import { resolveKey } from './_keys.mjs';
import { getTracker, configured } from './_store.mjs';

function computeStats(t) {
  const rows = t.rows || [], ms = t.milestones || [], goal = t.goalLossKg || 40;
  const stats = { readings: rows.length, injections: ms.length, goalLossKg: goal };
  if (rows.length) {
    const last = rows[rows.length - 1], first = rows[0];
    const fatMass = +(last.weight * last.fat / 100).toFixed(1);
    const lost = +(first.weight - last.weight).toFixed(1);
    Object.assign(stats, {
      latestDate: last.date, day: last.day, weightKg: last.weight, bodyFatPct: last.fat,
      muscleKg: last.muscle, fatMassKg: fatMass, totalLostKg: lost,
      percentOfGoal: Math.round((lost / goal) * 100), baselineKg: first.weight,
    });
  }
  if (ms.length) {
    const li = ms.reduce((a, m) => (Date.parse(m.date) > Date.parse(a.date) ? m : a), ms[0]);
    stats.lastInjection = { date: li.date, peptide: li.peptide, mg: li.mg };
    stats.daysSinceLastInjection = Math.max(
      0, Math.round((Date.now() - Date.parse(li.date + 'T00:00:00')) / 86400000),
    );
  }
  return stats;
}

function toMarkdown(login, t, s) {
  const L = [];
  L.push(`# Prometheus Tracer — @${login}`, '');
  if (s.weightKg != null) {
    L.push(`**Latest (${s.latestDate}, day ${s.day}):** ${s.weightKg} kg · ${s.bodyFatPct}% body fat · ${s.muscleKg} kg muscle · ${s.fatMassKg} kg fat mass`);
    L.push(`**Total lost:** ${s.totalLostKg} kg (${s.percentOfGoal}% of ${s.goalLossKg} kg goal · baseline ${s.baselineKg} kg)`);
  } else {
    L.push('_No measurements logged yet._');
  }
  if (s.lastInjection) {
    L.push(`**Last injection:** ${s.lastInjection.peptide} ${s.lastInjection.mg} mg on ${s.lastInjection.date} (${s.daysSinceLastInjection} days ago)`);
  }
  L.push('');
  if ((t.rows || []).length) {
    L.push(`## Measurements (${t.rows.length})`, '', '| Date | Day | Weight (kg) | Muscle (kg) | Body Fat % | Fat Mass (kg) | Lost (kg) |', '|---|---|---|---|---|---|---|');
    const base = t.rows[0].weight;
    for (const r of t.rows) {
      const fm = (r.weight * r.fat / 100).toFixed(1);
      const lost = (base - r.weight).toFixed(1);
      L.push(`| ${r.date} | ${r.day} | ${r.weight} | ${r.muscle} | ${r.fat} | ${fm} | ${lost} |`);
    }
    L.push('');
  }
  if ((t.milestones || []).length) {
    L.push(`## Injections (${t.milestones.length})`, '', '| Date | Day | Peptide | Dose (mg) |', '|---|---|---|---|');
    for (const m of t.milestones) L.push(`| ${m.date} | ${m.day} | ${m.peptide || ''} | ${m.mg != null ? m.mg : ''} |`);
    L.push('');
  }
  L.push('_Read-only export from Prometheus Tracer (a Ring Labs product)._');
  return L.join('\n');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  if (!configured()) return res.status(503).json({ error: 'Storage not configured yet.' });

  const q = req.query || {};
  const key =
    String(q.key || q.token || '').trim() ||
    String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();

  let login = null;
  try { login = await resolveKey(key); } catch { login = null; }
  if (!login)
    return res.status(401).json({ error: 'Invalid or missing key. Generate a data link in Prometheus Tracer → Connect AI.' });

  let t;
  try { t = await getTracker(login); } catch { return res.status(500).json({ error: 'failed to load data' }); }
  const stats = computeStats(t);

  const fmt = String(q.format || 'json').toLowerCase();
  if (fmt === 'md' || fmt === 'markdown' || fmt === 'txt' || fmt === 'text') {
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    return res.status(200).send(toMarkdown(login, t, stats));
  }
  return res.status(200).json({
    profile: { login },
    stats,
    goalLossKg: t.goalLossKg || 40,
    readings: t.rows,
    injections: t.milestones,
  });
}
