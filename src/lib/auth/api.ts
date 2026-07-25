// Auth API — psina service, cookie flow.
//
// Psina sets HttpOnly cookies (psina_access + psina_refresh) on login.
// All requests use credentials:'include' so cookies are sent automatically.
// Traefik forwardAuth calls psina /verify which reads the cookie server-side.
//
// JWT/Bearer flow (KrakenD etc.) is not implemented here intentionally.
// When needed, introduce NEXT_PUBLIC_AUTH_MODE=jwt and a separate implementation
// that stores tokens in memory (not localStorage — XSS risk) and sends Bearer headers.

const AUTH_BASE = "/auth.v1.AuthService";

export async function login(email: string, password: string): Promise<Response> {
  return fetch(`${AUTH_BASE}/Login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    credentials: "include",
  });
}

export async function register(email: string, password: string): Promise<Response> {
  return fetch(`${AUTH_BASE}/Register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    credentials: "include",
  });
}

export async function logout(): Promise<Response> {
  return fetch(`${AUTH_BASE}/Logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
    credentials: "include",
  });
}

export interface AuthCheckResult {
  authenticated: boolean
  email: string | null
  roles: string[]
}

const UNAUTHENTICATED: AuthCheckResult = { authenticated: false, email: null, roles: [] }

interface VerifyBody {
  email?: string
  roles?: string[]
}

export async function checkAuth(): Promise<AuthCheckResult> {
  if (process.env.NEXT_PUBLIC_MOCK_USER_ID) {
    return { authenticated: true, email: "demo@greedyeye.local", roles: [] }
  }

  try {
    const res = await fetch(`${AUTH_BASE}/Verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      credentials: "include",
    })
    if (res.ok) {
      const body = (await res.json().catch(() => ({}))) as VerifyBody
      return { authenticated: true, email: body.email ?? null, roles: body.roles ?? [] }
    }
    // Access token expired — attempt silent refresh via refresh cookie
    if (res.status === 401 && (await refreshToken())) {
      // Re-verify to pick up the email after the refresh
      return checkAuthOnce()
    }
    return UNAUTHENTICATED
  } catch {
    return UNAUTHENTICATED
  }
}

// Single Verify call without refresh retry (avoids refresh loops).
async function checkAuthOnce(): Promise<AuthCheckResult> {
  try {
    const res = await fetch(`${AUTH_BASE}/Verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      credentials: "include",
    })
    if (!res.ok) return UNAUTHENTICATED
    const body = (await res.json().catch(() => ({}))) as VerifyBody
    return { authenticated: true, email: body.email ?? null, roles: body.roles ?? [] }
  } catch {
    return UNAUTHENTICATED
  }
}

// Single-flight guard for token refresh.
//
// Psina rotates refresh tokens: each successful Refresh revokes the presented
// token and issues a new one, and re-presenting a revoked token trips reuse
// detection, which revokes the whole token family and logs the user out. On
// load the auth check and every data request can hit a 401 at once — without
// coalescing, they would each POST /Refresh with the same cookie, so the first
// rotates it and the rest replay the now-revoked token and kill the session.
// Sharing one in-flight promise means exactly one rotation happens per burst.
let inflightRefresh: Promise<boolean> | null = null

export function refreshToken(): Promise<boolean> {
  if (inflightRefresh) return inflightRefresh
  inflightRefresh = doRefresh().finally(() => {
    inflightRefresh = null
  })
  return inflightRefresh
}

async function doRefresh(): Promise<boolean> {
  try {
    // Psina reads refresh_token from psina_refresh cookie (body field empty → cookie fallback)
    const res = await fetch(`${AUTH_BASE}/Refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      credentials: "include",
    });
    return res.ok
  } catch {
    return false
  }
}
