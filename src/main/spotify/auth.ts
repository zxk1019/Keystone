import { createServer } from 'http'
import type { SpotifyError, SpotifyResult } from '@shared/spotify'
import { isRecord } from '@shared/validation'
import { REDIRECT_PORT, REDIRECT_URI } from './pkce'

const LOGIN_TIMEOUT_MS = 5 * 60_000

export interface Tokens {
  accessToken: string
  /** Spotify may send a new one when refreshing; it must replace the old one */
  refreshToken: string | null
  expiresAt: number
}

/** The small page the browser shows after the Spotify login. */
function page(message: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Keystone</title></head>
<body style="font-family:system-ui,sans-serif;display:grid;place-items:center;height:100vh;margin:0;background:#09090b;color:#f4f4f5">
<p style="font-size:18px;max-width:28rem;text-align:center">${message}</p></body></html>`
}

/**
 * Starts a temporary server on the loopback address, opens the Spotify login in the browser
 * and waits for Spotify to send the browser back with the authorization code.
 */
export function waitForCode(
  state: string,
  openBrowser: () => void,
  messages: { done: string; failed: string }
): Promise<SpotifyResult<string>> {
  return new Promise((resolve) => {
    let settled = false
    const finish = (result: SpotifyResult<string>): void => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      server.close()
      resolve(result)
    }

    const server = createServer((request, response) => {
      const url = new URL(request.url ?? '/', REDIRECT_URI)
      if (url.pathname !== '/callback') {
        response.writeHead(404).end()
        return
      }
      const code = url.searchParams.get('code')
      const ok = code !== null && url.searchParams.get('state') === state
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      response.end(page(ok ? messages.done : messages.failed))
      if (ok) finish({ ok: true, value: code })
      // "access_denied" means the user pressed Cancel on the Spotify page
      else finish({ ok: false, error: 'loginCanceled' })
    })

    const timeout = setTimeout(() => finish({ ok: false, error: 'loginTimeout' }), LOGIN_TIMEOUT_MS)
    server.on('error', (error: NodeJS.ErrnoException) =>
      finish({ ok: false, error: error.code === 'EADDRINUSE' ? 'portInUse' : 'unknown' })
    )
    server.listen(REDIRECT_PORT, '127.0.0.1', openBrowser)
  })
}

async function requestTokens(
  accountsBase: string,
  params: Record<string, string>
): Promise<SpotifyResult<Tokens>> {
  let response: Response
  try {
    response = await fetch(new URL('/api/token', accountsBase), {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params)
    })
  } catch {
    return { ok: false, error: 'network' }
  }
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok || !isRecord(body) || typeof body.access_token !== 'string') {
    // "invalid_grant": the refresh token no longer works (revoked or too old)
    const error: SpotifyError =
      isRecord(body) && body.error === 'invalid_grant' ? 'sessionExpired' : 'unknown'
    return { ok: false, error }
  }
  return {
    ok: true,
    value: {
      accessToken: body.access_token,
      refreshToken: typeof body.refresh_token === 'string' ? body.refresh_token : null,
      expiresAt: Date.now() + Number(body.expires_in ?? 3600) * 1000
    }
  }
}

export function exchangeCode(
  accountsBase: string,
  clientId: string,
  code: string,
  verifier: string
): Promise<SpotifyResult<Tokens>> {
  return requestTokens(accountsBase, {
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    client_id: clientId,
    code_verifier: verifier
  })
}

export function refreshTokens(
  accountsBase: string,
  clientId: string,
  refreshToken: string
): Promise<SpotifyResult<Tokens>> {
  return requestTokens(accountsBase, {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId
  })
}
