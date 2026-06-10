import { QueryClient } from '@tanstack/react-query'

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

export function makeQueryClient() {
  return new QueryClient(queryClientConfig)
}
