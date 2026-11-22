import { useQuery } from '@tanstack/react-query'
import { getMacroRates } from '@/lib/api/assets-api'
import type { MacroSeries } from '@/lib/api/backend-types'
import { DEMO_MODE } from '@/lib/config/data-source'
import { demoMacroRates } from '@/lib/mocks/macro'

// Policy rates change a few times a year and the backend caches them for
// hours, so the widget asks again at most every half hour. gcTime matches:
// the shared client drops inactive queries after five minutes, which would
// let a return to the dashboard ask again sooner.
const RATES_STALE_MS = 30 * 60 * 1000

export function useMacroRates() {
  return useQuery<MacroSeries[]>({
    queryKey: ['macro', 'rates'],
    queryFn: DEMO_MODE ? async () => demoMacroRates : getMacroRates,
    staleTime: RATES_STALE_MS,
    gcTime: RATES_STALE_MS,
  })
}
