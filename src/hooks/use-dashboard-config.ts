/**
 * Dashboard layout: load and save the widget arrangement.
 *
 * Backend mode: SettingsService under the key "dashboard.v1", so the layout
 * follows the user to another device.
 * Demo mode: localStorage. There is no backend to talk to, and a demo whose
 * arrangement resets on every reload teaches the wrong thing about the feature.
 */

import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSetting, setSetting } from '@/lib/api/settings-api'
import {
  DASHBOARD_SETTING_KEY,
  defaultDashboardConfig,
  parseDashboardConfig,
  type DashboardConfig,
} from '@/lib/config/dashboard-widgets'
import { DEMO_MODE } from '@/lib/config/data-source'

const QUERY_KEY = ['dashboard-config']
const STORAGE_KEY = 'greedy-eye.dashboard.v1'

function readLocal(): DashboardConfig | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return parseDashboardConfig(JSON.parse(raw))
  } catch {
    // Corrupt local state is not worth an error screen: fall through to the
    // default arrangement, which the next save overwrites.
    return null
  }
}

function writeLocal(config: DashboardConfig): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
}

async function loadConfig(): Promise<DashboardConfig> {
  const stored = DEMO_MODE ? readLocal() : parseDashboardConfig(await getSetting(DASHBOARD_SETTING_KEY))
  return stored ?? defaultDashboardConfig()
}

async function saveConfig(config: DashboardConfig): Promise<void> {
  if (DEMO_MODE) {
    writeLocal(config)
    return
  }
  await setSetting(DASHBOARD_SETTING_KEY, config)
}

export interface DashboardConfigResult {
  config: DashboardConfig
  isLoading: boolean
  /** Set when a save failed; the shown layout is then ahead of the stored one. */
  saveError: Error | null
  save: (config: DashboardConfig) => void
}

export function useDashboardConfig(): DashboardConfigResult {
  const queryClient = useQueryClient()

  const query = useQuery<DashboardConfig>({
    queryKey: QUERY_KEY,
    queryFn: loadConfig,
    // The layout changes when this user changes it, and this hook already
    // writes the cache on save. Refetching would only ever undo a local edit
    // that is still in flight.
    staleTime: Infinity,
  })

  const mutation = useMutation({
    mutationFn: saveConfig,
    // Optimistic: editing a layout is a direct manipulation, and a widget that
    // springs back for a round trip before landing reads as a failed click.
    onMutate: async (config: DashboardConfig) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY })
      const previous = queryClient.getQueryData<DashboardConfig>(QUERY_KEY)
      queryClient.setQueryData(QUERY_KEY, config)
      return { previous }
    },
    onError: (_err, _config, context) => {
      // Put back what was actually stored. Leaving the optimistic layout up
      // would show an arrangement that does not survive a reload.
      if (context?.previous) queryClient.setQueryData(QUERY_KEY, context.previous)
    },
  })

  const save = useCallback((config: DashboardConfig) => mutation.mutate(config), [mutation])

  return {
    config: query.data ?? defaultDashboardConfig(),
    isLoading: query.isLoading,
    saveError: mutation.error,
    save,
  }
}
