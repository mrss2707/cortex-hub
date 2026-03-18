/**
 * API key authentication middleware for MCP requests.
 *
 * For v1: Simple bearer token validation against env var.
 * Future: KV-backed API key management with per-key permissions.
 */
export function validateApiKey(
  request: Request,
  env: Env
): { valid: boolean; error?: string; agentId?: string } {
  // Allow health checks without auth
  const url = new URL(request.url)
  if (url.pathname === '/health') {
    return { valid: true }
  }

  const authHeader = request.headers.get('Authorization')

  if (!authHeader) {
    return { valid: false, error: 'Missing Authorization header' }
  }

  const [scheme, token] = authHeader.split(' ')

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return { valid: false, error: 'Invalid Authorization format. Use: Bearer <API_KEY>' }
  }

  // v1: Validate against environment variable
  // Future: Look up in KV/D1 for per-key permissions
  const validKeys = (env.API_KEYS ?? '').split(',').filter(Boolean)

  // If no keys configured, allow all (development mode)
  if (validKeys.length === 0) {
    return { valid: true, agentId: 'anonymous' }
  }

  if (!validKeys.includes(token)) {
    return { valid: false, error: 'Invalid API key' }
  }

  // Extract agent ID from key prefix if format is: agentId:secret
  const agentId = token.includes(':') ? token.split(':')[0] : 'default'

  return { valid: true, agentId }
}
