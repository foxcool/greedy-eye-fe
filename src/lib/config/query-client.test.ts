import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/api/client'
import { queryClientConfig, shouldRetryQuery } from './query-client'

describe('shouldRetryQuery', () => {
  it('does not retry a 4xx', () => {
    expect(shouldRetryQuery(0, new ApiError(404, 'not found'))).toBe(false)
    expect(shouldRetryQuery(0, new ApiError(400, 'bad request'))).toBe(false)
  })

  it('retries a 5xx, a network failure or a client timeout once', () => {
    expect(shouldRetryQuery(0, new ApiError(503, 'unavailable'))).toBe(true)
    expect(shouldRetryQuery(0, new TypeError('Failed to fetch'))).toBe(true)
    expect(shouldRetryQuery(0, new DOMException('The operation was aborted.', 'AbortError'))).toBe(true)
    expect(shouldRetryQuery(1, new ApiError(503, 'unavailable'))).toBe(false)
  })
})

describe('queryClientConfig', () => {
  it('retries queries through shouldRetryQuery', () => {
    expect(queryClientConfig.defaultOptions.queries.retry).toBe(shouldRetryQuery)
  })

  it('never retries mutations', () => {
    expect(queryClientConfig.defaultOptions.mutations.retry).toBe(false)
  })
})
