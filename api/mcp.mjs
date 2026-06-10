// Remote MCP server (Streamable HTTP / JSON-RPC 2.0) for Prometheus Tracer.
// READ-ONLY: lets a user's AI read their own body-composition data. Auth is a
// personal API token sent as `Authorization: Bearer <token>`. (Write tools are
// intentionally not exposed yet — planned as a paid feature.)
import { resolveKey } from './_keys.mjs';
import { getTracker } from './_store.mjs';

const PROTO = '2025-06-18';
const SERVER = { name: 'prometheus-tracer', version: '1.0.0' };

const TOOLS = [
  {
    name: 'get_tracker',
    description:
      'Get the full body-composition tracker for the authenticated user: all readings and injections, the start date, and the goal.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'get_stats',
    description:
      'Computed summary: latest weight, body fat %, muscle, fat mass, total lost, % of goal, and days since the last injection.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'list_readings',
    description: 'List all InBody measurements (date, day, weight kg, muscle kg, body fat %).',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'list_injections',
    description: 'List all logged injections / pins (date, day, peptide, mg).',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
];

const rpc = (id, result) => ({ jsonrpc: '2.0', id, result });
const rpcErr = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });

async function callTool(login, name) {
  const t = await getTracker(login);
  if (name === 'get_tracker') return t;
  if (name === 'list_readings') return t.rows;
  if (name === 'list_injections') return t.milestones;
  if (name === 'get_stats') {
    const rows = t.rows, ms = t.milestones, goal = t.goalLossKg || 40;
    const stats = { readings: rows.length, injections: ms.length, goalLossKg: goal };
    if (rows.length) {
      const last = rows[rows.length - 1], first = rows[0];
      const fatMass = +(last.weight * last.fat / 100).toFixed(1);
      const lost = +(first.weight - last.weight).toFixed(1);
      Object.assign(stats, {
        latestDate: last.date, weightKg: last.weight, bodyFatPct: last.fat,
        muscleKg: last.muscle, fatMassKg: fatMass, totalLostKg: lost,
        percentOfGoal: Math.round((lost / goal) * 100),
      });
    }
    if (ms.length) {
      const li = ms.reduce((a, m) => (Date.parse(m.date) > Date.parse(a.date) ? m : a), ms[0]);
      stats.lastInjection = { date: li.date, peptide: li.peptide, mg: li.mg };
      stats.daysSinceLastInjection = Math.max(
        0,
        Math.round((Date.now() - Date.parse(li.date + 'T00:00:00')) / 86400000),
      );
    }
    return stats;
  }
  return undefined;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Mcp-Session-Id, Mcp-Protocol-Version');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Prometheus Tracer MCP — use POST (Streamable HTTP).' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  if (!body) return res.status(400).json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });

  // resolve the bearer token -> github login (used by tools/call)
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  let login = null;
  try { login = await resolveKey(token); } catch { login = null; }

  const batch = Array.isArray(body);
  const msgs = batch ? body : [body];
  const out = [];

  for (const m of msgs) {
    if (!m || m.jsonrpc !== '2.0') continue;
    const { id, method, params } = m;
    if (method === 'initialize') {
      out.push(rpc(id, {
        protocolVersion: (params && params.protocolVersion) || PROTO,
        capabilities: { tools: {} },
        serverInfo: SERVER,
        instructions: 'Body-composition tracker. Read-only tools for the authenticated user.',
      }));
    } else if (method === 'ping') {
      out.push(rpc(id, {}));
    } else if (typeof method === 'string' && method.startsWith('notifications/')) {
      // notifications get no response
    } else if (method === 'tools/list') {
      out.push(rpc(id, { tools: TOOLS }));
    } else if (method === 'tools/call') {
      if (!login) {
        out.push(rpcErr(id, -32001, 'Unauthorized: pass your Prometheus Tracer API token as a Bearer token.'));
        continue;
      }
      const name = params && params.name;
      try {
        const data = await callTool(login, name);
        if (data === undefined) out.push(rpcErr(id, -32602, 'Unknown tool: ' + name));
        else out.push(rpc(id, { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }));
      } catch (e) {
        out.push(rpc(id, { content: [{ type: 'text', text: 'Error reading tracker.' }], isError: true }));
      }
    } else if (id !== undefined && id !== null) {
      out.push(rpcErr(id, -32601, 'Method not found: ' + method));
    }
  }

  if (out.length === 0) return res.status(202).end(); // notifications only
  res.setHeader('Content-Type', 'application/json');
  return res.status(200).json(batch ? out : out[0]);
}
