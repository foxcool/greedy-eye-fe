import { useQuery } from '@tanstack/react-query'
import { listProviders } from '@/lib/api/portfolio-api'
import type { Provider } from '@/lib/api/backend-types'

// The catalogue is a property of the deployment, not of the user or the
// session: it changes when the backend is upgraded and not otherwise. So it is
// cached for the life of the tab rather than refetched on every dialog open.
const CATALOGUE_STALE_MS = 60 * 60 * 1000

// useProviders lists what this backend can talk to.
//
// A deployment that composes no adapters answers Unimplemented, and an older
// backend answers 404. Both mean "this instance cannot tell you", which is not
// the same as "there are no providers" — the form falls back to a free-text
// slug in that case rather than offering an empty list and blocking an account
// nobody could otherwise create.
export function useProviders() {
  return useQuery<Provider[]>({
    queryKey: ['providers'],
    queryFn: listProviders,
    staleTime: CATALOGUE_STALE_MS,
    // One failed catalogue must not cost the account form: retrying an
    // Unimplemented answer only delays the fallback.
    retry: false,
  })
}
