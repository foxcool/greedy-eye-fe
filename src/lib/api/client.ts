interface ApiClientOptions {
  baseURL?: string
  headers?: HeadersInit
  timeout?: number
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  params?: Record<string, string | number | boolean>
  timeout?: number
}

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public response?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// Allows the auth layer to register a redirect handler that uses Next.js router
// (which respects basePath). Falls back to window.location if not set.
let unauthenticatedHandler: (() => void) | null = null

export function setUnauthenticatedHandler(handler: () => void) {
  unauthenticatedHandler = handler
}

function redirectToLogin() {
  if (unauthenticatedHandler) {
    unauthenticatedHandler()
  } else if (typeof window !== 'undefined') {
    window.location.href = '/login'
  }
}

class ApiClient {
  // Empty string means relative URLs (behind Traefik proxy).
  private baseURL: string
  private defaultHeaders: HeadersInit
  private defaultTimeout: number

  constructor(options: ApiClientOptions = {}) {
    // Use ?? (not ||) so that empty string is preserved as "use relative URLs"
    const envUrl = process.env.NEXT_PUBLIC_API_URL
    this.baseURL = options.baseURL ?? envUrl ?? 'http://localhost:8080'
    const mockUserId = process.env.NEXT_PUBLIC_MOCK_USER_ID
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...(mockUserId ? { 'X-User-Id': mockUserId, 'X-User-Email': 'dev@greedyeye.local' } : {}),
      ...options.headers,
    }
    // 10s suits a read. It does not suit every call, and until this default was
    // per-request overridable it was silently applied to account sync too — a
    // multi-chain operation measured at ~22s. Prod 2026-07-25 shows the result:
    // syncs aborted at 10.005s server-side, mid-write. A long call passes its
    // own timeout; see syncAccount.
    this.defaultTimeout = options.timeout ?? 10000  // 10s — fail fast
  }

  private async doFetch<T>(url: string, options: RequestInit, timeoutMs = this.defaultTimeout): Promise<T> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    // Attach Bearer token if available (psina JWT flow)
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new ApiError(
        response.status,
        (error as { message?: string }).message || `HTTP ${response.status}: ${response.statusText}`,
        error
      )
    }

    const text = await response.text()
    return text ? JSON.parse(text) : ({} as T)
  }

  // No retries here: that is TanStack Query's job, the only layer that knows a
  // read from a write (see query-client.ts). The one re-send is after a 401
  // refresh — the server rejected the call without running it, so it is safe
  // even for a write.
  private async fetchWithRefresh<T>(url: string, options: RequestInit, timeoutMs?: number): Promise<T> {
    try {
      return await this.doFetch<T>(url, options, timeoutMs)
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 401)) throw error

      const { refreshToken } = await import('@/lib/auth/api')
      if (await refreshToken()) return this.doFetch<T>(url, options, timeoutMs)
      // Refresh failed — redirect to login via registered handler (respects basePath)
      redirectToLogin()
      throw error
    }
  }

  private buildURL(path: string, params?: Record<string, string | number | boolean>): string {
    if (!this.baseURL) {
      // Relative URL — served behind a proxy (e.g. Traefik)
      if (!params) return path
      const qs = new URLSearchParams(
        Object.entries(params).map(([k, v]) => [k, String(v)])
      ).toString()
      return `${path}?${qs}`
    }

    const url = new URL(path, this.baseURL)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value))
      })
    }
    return url.toString()
  }

  async get<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { params, timeout, ...fetchOptions } = options
    const url = this.buildURL(path, params)

    return this.fetchWithRefresh<T>(url, {
      method: 'GET',
      headers: { ...this.defaultHeaders, ...fetchOptions.headers },
      ...fetchOptions,
    }, timeout)
  }

  async post<T>(path: string, data?: unknown, options: RequestOptions = {}): Promise<T> {
    const { params, timeout, ...fetchOptions } = options
    const url = this.buildURL(path, params)

    return this.fetchWithRefresh<T>(url, {
      method: 'POST',
      headers: { ...this.defaultHeaders, ...fetchOptions.headers },
      body: data ? JSON.stringify(data) : undefined,
      ...fetchOptions,
    }, timeout)
  }

  async put<T>(path: string, data?: unknown, options: RequestOptions = {}): Promise<T> {
    const { params, timeout, ...fetchOptions } = options
    const url = this.buildURL(path, params)

    return this.fetchWithRefresh<T>(url, {
      method: 'PUT',
      headers: { ...this.defaultHeaders, ...fetchOptions.headers },
      body: data ? JSON.stringify(data) : undefined,
      ...fetchOptions,
    }, timeout)
  }

  async delete<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { params, timeout, ...fetchOptions } = options
    const url = this.buildURL(path, params)

    return this.fetchWithRefresh<T>(url, {
      method: 'DELETE',
      headers: { ...this.defaultHeaders, ...fetchOptions.headers },
      ...fetchOptions,
    }, timeout)
  }
}

// Singleton instance
export const apiClient = new ApiClient()
export { ApiError }
export type { ApiClientOptions, RequestOptions }
