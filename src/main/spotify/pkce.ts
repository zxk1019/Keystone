import { createHash, randomBytes } from 'crypto'

// Authorization Code with PKCE: the app proves it started the login without needing a
// client secret, which a desktop app could not keep secret anyway.
// https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow

export const REDIRECT_PORT = 43821
/** Must match exactly the Redirect URI registered in the Spotify developer dashboard */
export const REDIRECT_URI = `http://127.0.0.1:${REDIRECT_PORT}/callback`

export const SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'playlist-read-private',
  'playlist-read-collaborative',
  // Tells whether the account is Premium, so the app can say it clearly
  'user-read-private'
]

/** A random string of 43-128 URL-safe characters. */
export function createVerifier(): string {
  return randomBytes(64).toString('base64url')
}

export function challengeFor(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url')
}

export function createState(): string {
  return randomBytes(16).toString('base64url')
}

export function authorizeUrl(
  accountsBase: string,
  clientId: string,
  challenge: string,
  state: string
): string {
  const url = new URL('/authorize', accountsBase)
  url.search = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    scope: SCOPES.join(' '),
    state
  }).toString()
  return url.toString()
}
