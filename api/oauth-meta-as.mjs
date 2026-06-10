// OAuth 2.0 Authorization Server Metadata (RFC 8414).
// Served at /.well-known/oauth-authorization-server via vercel.json rewrite.
import { originFromRequest } from './_oauth.mjs';

export default function handler(req, res) {
  const o = originFromRequest(req);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.status(200).json({
    issuer: o,
    authorization_endpoint: `${o}/api/oauth/authorize`,
    token_endpoint: `${o}/api/oauth/token`,
    registration_endpoint: `${o}/api/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: ['read'],
  });
}
