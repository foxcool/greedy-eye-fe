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
    credentials: "include",
  });
}

export async function checkAuth(): Promise<boolean> {
  try {
    const res = await fetch("/auth.v1.AuthService/Verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    return res.ok;
  } catch {
    // Network error — API unreachable (standalone dev without Traefik/psina)
    if (process.env.NEXT_PUBLIC_MOCK_USER_ID) {
      console.warn("[auth] API unreachable, using mock auth (NEXT_PUBLIC_MOCK_USER_ID set)");
      return true;
    }
    return false;
  }
}

export async function refreshToken(): Promise<boolean> {
  try {
    const res = await fetch("/auth.v1.AuthService/Refresh", {
      method: "POST",
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}
