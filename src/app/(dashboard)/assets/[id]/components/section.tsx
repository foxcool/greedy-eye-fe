import type { ReactNode } from 'react'

/**
 * The bordered definition list this page uses for every fact block, extracted so
 * the markup from portfolio-settings.tsx is not copied five times in one
 * directory. It is the only <dl> pattern in the repo; five hand-copies is how it
 * would stop being one pattern.
 */
export function Section({
  title,
  description,
  children,
  action,
}: {
  title: string
  description?: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

/** The <dl> wrapper. Use with <Row>. */
export function Facts({ children }: { children: ReactNode }) {
  return <dl className="rounded-lg border border-border divide-y divide-border">{children}</dl>
}

export function Row({
  label,
  children,
  muted = false,
}: {
  label: string
  children: ReactNode
  muted?: boolean
}) {
  return (
    <div className="flex justify-between gap-4 px-4 py-3">
      <dt className="text-sm text-muted-foreground shrink-0">{label}</dt>
      <dd
        className={`text-sm text-right ${muted ? 'text-muted-foreground' : 'font-medium text-foreground'}`}
      >
        {children}
      </dd>
    </div>
  )
}

/** Shared empty state, matching the dashed-border idiom used across the app. */
export function EmptyPanel({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-8 text-center">
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  )
}
