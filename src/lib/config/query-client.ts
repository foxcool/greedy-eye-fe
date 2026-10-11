import { MutationCache, QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError } from '@/lib/api/client'

// One retry, for reads only, and only for failures a retry can fix. A 4xx is
// the server's answer, not a hiccup: retrying it just delays the error by the
// backoff. Network errors and client-side timeouts are not ApiErrors and stay
// retryable. This is the only retry layer: the API client sends once, so a
// dead backend surfaces after two attempts, not the eight the two stacked
// layers used to make.
const MAX_QUERY_RETRIES = 1

export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status < 500) return false
  return failureCount < MAX_QUERY_RETRIES
}

export const queryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,        // 30 seconds — data stays fresh
      gcTime: 5 * 60 * 1000,        // 5 minutes - garbage collection time
      retry: shouldRetryQuery,
      retryDelay: (attemptIndex: number) =>
        Math.min(1000 * Math.pow(2, attemptIndex), 30000), // Exponential backoff
      refetchOnWindowFocus: true,    // Refetch when window regains focus
      refetchOnReconnect: true,      // Refetch when reconnecting
    },
    mutations: {
      // Never: every RPC is a POST with no idempotency key, so a write that
      // timed out after the server committed it would be applied twice.
      // SyncAccount showed it: a re-sent sync, while the first still ran on
      // the server, put two concurrent writers on one account's rows.
      retry: false,
    },
  },
}

// Mutations are user-initiated writes, so a failure has to be visible. Without
// this the UI silently does nothing and the action reads as a dead button —
// which is exactly how a rejected account deletion presented. Reporting here
// covers every mutation at once, including ones added later; a mutation may
// still declare its own onError, and both run.
function reportMutationError(error: unknown) {
  toast.error(error instanceof Error ? error.message : 'Request failed')
}

export function makeQueryClient() {
  return new QueryClient({
    ...queryClientConfig,
    mutationCache: new MutationCache({ onError: reportMutationError }),
  })
}
