import { MutationCache, QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export const queryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,        // 30 seconds — data stays fresh
      gcTime: 5 * 60 * 1000,        // 5 minutes - garbage collection time
      retry: 3,                      // Retry failed requests 3 times
      retryDelay: (attemptIndex: number) =>
        Math.min(1000 * Math.pow(2, attemptIndex), 30000), // Exponential backoff
      refetchOnWindowFocus: true,    // Refetch when window regains focus
      refetchOnReconnect: true,      // Refetch when reconnecting
    },
    mutations: {
      retry: 1,                      // Retry mutations once
      retryDelay: 1000,
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
