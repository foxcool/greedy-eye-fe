'use client'

import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

/** Tailwind status color for a signed change. */
export function changeColor(value: number): string {
  if (value > 0) return 'text-green-500'
  if (value < 0) return 'text-red-500'
  return 'text-muted-foreground'
}

interface WidgetCardProps {
  title: string
  /** Optional right-aligned header note, e.g. source or "as of" time. */
  note?: string
  loading?: boolean
  empty?: boolean
  emptyLabel?: string
  className?: string
  children?: React.ReactNode
}

/**
 * Shared shell for dashboard macro widgets: titled card with loading / empty
 * states so individual widgets only render their data rows.
 */
export function WidgetCard({
  title,
  note,
  loading,
  empty,
  emptyLabel = 'No data yet',
  className,
  children,
}: WidgetCardProps) {
  return (
    <Card className={cn('h-full', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {note && <span className="text-xs text-muted-foreground">{note}</span>}
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : empty ? (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}
