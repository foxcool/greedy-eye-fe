import { useQuery } from '@tanstack/react-query'
import { fetchMacroSnapshot, type MacroSnapshot } from '@/lib/mocks/macro'

/**
 * Macro/world-finance snapshot for the dashboard widgets.
 * Backed by mock data today; swap `fetchMacroSnapshot` for a real fetcher later.
 */
export function useMacro() {
  return useQuery<MacroSnapshot>({
    queryKey: ['macro', 'snapshot'],
    queryFn: fetchMacroSnapshot,
    staleTime: 60 * 1000,
  })
}
