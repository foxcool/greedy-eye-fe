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
  private baseURL: string
  private defaultHeaders: HeadersInit
  private defaultTimeout: number
  private defaultRetries: number

  constructor(options: ApiClientOptions = {}) {
    this.baseURL = options.baseURL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...options.headers,
    }
    this.defaultTimeout = options.timeout || 30000
    this.defaultRetries = options.retries || 3
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
          signal: controller.signal,
        })

        clearTimeout(timeout)

        if (!response.ok) {
          const error = await response.json().catch(() => ({}))
          throw new ApiError(
            response.status,
            error.message || `HTTP ${response.status}: ${response.statusText}`,
            error
          )
        }

        // Handle empty responses
        const text = await response.text()
        return text ? JSON.parse(text) : ({} as T)
      } catch (error) {
        // Don't retry on 4xx errors (client errors)
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          throw error
        }

        // Retry on network errors or 5xx errors
        if (attempt < retries) {
          const backoff = Math.min(1000 * Math.pow(2, attempt), 10000)
          await new Promise(resolve => setTimeout(resolve, backoff))
          continue
        }

        throw error
      }
    }

    throw new Error('Retry limit exceeded')
  }

  private buildURL(path: string, params?: Record<string, string | number | boolean>): string {
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
