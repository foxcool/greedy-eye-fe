'use client'

import { useTheme } from 'next-themes'
import { useSyncExternalStore } from 'react'

const emptySubscribe = () => () => {}

// Hydration guard: false during SSR/first client render, true after.
// useSyncExternalStore avoids the setState-in-effect cascading render.
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const mounted = useMounted()

  if (!mounted) {
    return (
      <button
        className="px-3 py-1.5 bg-secondary rounded-md text-sm font-medium"
        aria-label="Loading theme"
        disabled
      >
        ...
      </button>
    )
  }

  const nextTheme = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark'
  const label = theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '🖥️'

  return (
    <button
      onClick={() => setTheme(nextTheme)}
      aria-label={`Switch to ${nextTheme} theme`}
      className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 rounded-md text-sm font-medium text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {label} {theme}
    </button>
  )
}
