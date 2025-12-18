export function getWebAuthnConfig(event: any) {
  const host = event.node.req.headers.host || 'localhost'
  const rpID = host.split(':')[0]
  const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http'
  
  // In development, we might use http://localhost:3000
  // WebAuthn requires https except for localhost
  const origin = `${protocol}://${host}`
  
  return {
    rpID,
    rpName: 'VRC Remix',
    origin,
  }
}
