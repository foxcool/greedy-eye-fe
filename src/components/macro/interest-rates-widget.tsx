'use client'

import { useMacroRates } from '@/hooks/use-macro-rates'
import type { MacroSeries } from '@/lib/api/backend-types'
import { WidgetCard } from './widget-card'

// What each series is called on screen. A series the backend adds before this
// map knows it is shown under its id rather than hidden.
const SERIES_LABELS: Record<string, { name: string; publisher: string }> = {
  fed_funds: { name: 'US Fed funds rate', publisher: 'FRED' },
  cbr_key_rate: { name: 'Bank of Russia key rate', publisher: 'Bank of Russia' },
}

export function InterestRatesWidget() {
  const { data, isLoading, error } = useMacroRates()
  return <InterestRatesCard series={data ?? []} loading={isLoading} error={error?.message} />
}

export function InterestRatesCard({
  series,
  loading,
  error,
}: {
  series: MacroSeries[]
  loading?: boolean
  error?: string
}) {
  return (
    <WidgetCard title="Interest rates" loading={loading} empty={!loading && !error && series.length === 0}>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          Rates unavailable: {error}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {series.map((s) => (
            <RateRow key={s.series} s={s} />
          ))}
        </ul>
      )}
    </WidgetCard>
  )
}

function RateRow({ s }: { s: MacroSeries }) {
  const label = SERIES_LABELS[s.series] ?? { name: s.series, publisher: s.source ?? '' }
  return (
    <li className="flex items-center justify-between gap-2 py-2">
      <div>
        <p className="text-sm font-medium text-foreground">{label.name}</p>
        <p className="text-xs text-muted-foreground">
          {s.available
            ? `${label.publisher}, as of ${s.observationDate}`
            : `${label.publisher}: ${s.unavailableReason ?? 'unavailable'}`}
        </p>
      </div>
      <p className="text-sm font-semibold tabular-nums text-foreground">{s.available ? `${s.value}%` : '—'}</p>
    </li>
  )
}
