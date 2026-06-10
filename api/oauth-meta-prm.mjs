// OAuth 2.0 Protected Resource Metadata (RFC 9728) for the MCP endpoint.
// Served at /.well-known/oauth-protected-resource[/api/mcp] via rewrite.
import { originFromRequest } from './_oauth.mjs';

export default function handler(req, res) {
  const o = originFromRequest(req);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.status(200).json({
    resource: `${o}/api/mcp`,
    authorization_servers: [o],
    scopes_supported: ['read'],
    bearer_methods_supported: ['header'],
  });
}
