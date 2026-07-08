'use client'

import { useTheme } from 'next-themes'
import { useSyncExternalStore } from 'react'
import { cn } from '@/lib/utils'
import { useUIStyle, type UIStyle } from '@/components/style-provider'

const emptySubscribe = () => () => {}

function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )
}

const STYLES: { value: UIStyle; label: string; description: string }[] = [
  { value: 'ledger', label: 'Ledger', description: 'Ink & paper, calm terminal' },
  { value: 'observatory', label: 'Observatory', description: 'Teal glow, dense sky' },
]

const SCHEMES = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const

function SegmentButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-md border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'border-ring bg-secondary text-foreground'
          : 'border-border text-muted-foreground hover:bg-secondary hover:text-foreground'
      )}
    >
      {children}
    </button>
  )
}

export function Appearance() {
  const { style, setStyle } = useUIStyle()
  const { theme, setTheme } = useTheme()
  const mounted = useMounted()

  if (!mounted) {
    return (
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Appearance</h2>
        <div className="h-24 animate-pulse rounded-lg bg-muted" />
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Appearance</h2>

      <div className="space-y-1.5">
        <p className="text-sm text-muted-foreground">Style</p>
        <div className="flex gap-2">
          {STYLES.map((s) => (
            <SegmentButton
              key={s.value}
              active={style === s.value}
              onClick={() => setStyle(s.value)}
            >
              <span className="font-medium">{s.label}</span>
              <span className="ml-2 hidden text-xs text-muted-foreground sm:inline">
                {s.description}
              </span>
            </SegmentButton>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-sm text-muted-foreground">Scheme</p>
        <div className="flex gap-2">
          {SCHEMES.map((s) => (
            <SegmentButton
              key={s.value}
              active={theme === s.value}
              onClick={() => setTheme(s.value)}
            >
              {s.label}
            </SegmentButton>
          ))}
        </div>
      </div>
    </section>
  )
}
