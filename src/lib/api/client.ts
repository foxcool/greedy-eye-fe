interface ApiClientOptions {
  baseURL?: string
  headers?: HeadersInit
  timeout?: number
  retries?: number
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  params?: Record<string, string | number | boolean>
  timeout?: number
  retries?: number
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

class ApiClient {
  // Empty string means relative URLs (behind Traefik proxy).
  private baseURL: string
  private defaultHeaders: HeadersInit
  private defaultTimeout: number
  private defaultRetries: number

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
    this.defaultTimeout = options.timeout ?? 10000  // 10s — fail fast
    this.defaultRetries = options.retries ?? 1      // 1 retry — avoid 90s hangs
  }

  private async fetchWithRetry<T>(
    url: string,
    options: RequestInit,
    retries: number
  ): Promise<T> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), this.defaultTimeout)

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
      } catch (error) {
        // Don't retry on 4xx errors (client errors)
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          throw error
        }

        if (attempt < retries) {
          const backoff = Math.min(1000 * Math.pow(2, attempt), 5000)
          await new Promise(resolve => setTimeout(resolve, backoff))
          continue
        }

        throw error
      }
    }

    throw new Error('Retry limit exceeded')
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
    const { params, retries = this.defaultRetries, ...fetchOptions } = options
    const url = this.buildURL(path, params)

    return this.fetchWithRetry<T>(url, {
      method: 'GET',
      headers: { ...this.defaultHeaders, ...fetchOptions.headers },
      ...fetchOptions,
    }, retries)
  }

  async post<T>(path: string, data?: unknown, options: RequestOptions = {}): Promise<T> {
    const { params, retries = this.defaultRetries, ...fetchOptions } = options
    const url = this.buildURL(path, params)

    return this.fetchWithRetry<T>(url, {
      method: 'POST',
      headers: { ...this.defaultHeaders, ...fetchOptions.headers },
      body: data ? JSON.stringify(data) : undefined,
      ...fetchOptions,
    }, retries)
  }

  async put<T>(path: string, data?: unknown, options: RequestOptions = {}): Promise<T> {
    const { params, retries = this.defaultRetries, ...fetchOptions } = options
    const url = this.buildURL(path, params)

    return this.fetchWithRetry<T>(url, {
      method: 'PUT',
      headers: { ...this.defaultHeaders, ...fetchOptions.headers },
      body: data ? JSON.stringify(data) : undefined,
      ...fetchOptions,
    }, retries)
  }

  async delete<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { params, retries = this.defaultRetries, ...fetchOptions } = options
    const url = this.buildURL(path, params)

    return this.fetchWithRetry<T>(url, {
      method: 'DELETE',
      headers: { ...this.defaultHeaders, ...fetchOptions.headers },
      ...fetchOptions,
    }, retries)
  }
}

// Singleton instance
export const apiClient = new ApiClient()
export { ApiError }
export type { ApiClientOptions, RequestOptions }
