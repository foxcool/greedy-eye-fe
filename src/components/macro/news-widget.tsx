'use client'

import { useMacro } from '@/hooks/use-macro'
import { WidgetCard } from './widget-card'

export function NewsWidget() {
  const { data, isLoading } = useMacro()
  const news = data?.news ?? []

  return (
    <WidgetCard
      title="Financial news"
      loading={isLoading}
      empty={!isLoading && news.length === 0}
    >
      <ul className="divide-y divide-border">
        {news.map((item) => {
          const content = (
            <div className="flex items-start gap-2 py-2">
              {item.importance === 'high' && (
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500" aria-hidden />
              )}
              <div className="min-w-0">
                <p className="text-sm text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground">
                  {item.source} · {new Date(item.time).toLocaleString()}
                </p>
              </div>
            </div>
          )
          return (
            <li key={item.id}>
              {item.url ? (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block hover:bg-secondary/40 rounded-md transition-colors"
                >
                  {content}
                </a>
              ) : (
                content
              )}
            </li>
          )
        })}
      </ul>
    </WidgetCard>
  )
}
