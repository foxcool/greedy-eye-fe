'use client'

import { useSyncExternalStore } from 'react'

/**
 * UI style axis of the theme model (design system v1).
 * Independent from the light/dark scheme handled by next-themes:
 *   style  -> html[data-style="ledger" | "observatory"]
 *   scheme -> html.dark (next-themes)
 * Persisted in localStorage under "ge-style"; an inline script in the root
 * layout applies it before first paint. The DOM attribute is the source of
 * truth — this module is a thin external store around it.
 */
export type UIStyle = 'ledger' | 'observatory'

const STORAGE_KEY = 'ge-style'

let listeners: Array<() => void> = []

function subscribe(listener: () => void) {
  listeners.push(listener)
  return () => {
    listeners = listeners.filter((l) => l !== listener)
  }
}

function getSnapshot(): UIStyle {
  return document.documentElement.dataset.style === 'observatory'
    ? 'observatory'
    : 'ledger'
}

function getServerSnapshot(): UIStyle {
  return 'ledger'
}

export function setUIStyle(next: UIStyle) {
  document.documentElement.dataset.style = next
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // localStorage unavailable (private mode etc.) — style stays for the session
  }
  listeners.forEach((l) => l())
}

export function useUIStyle() {
  const style = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return { style, setStyle: setUIStyle }
}
