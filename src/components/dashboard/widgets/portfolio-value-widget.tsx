'use client'

import { PortfolioValueHeader } from '@/components/portfolio/portfolio-value-header'
import { Card, CardContent } from '@/components/ui/card'
import type { WidgetProps } from '../widget-registry'

/**
 * Total value and 24h change.
 *
 * The number itself comes from PortfolioValueHeader, which the portfolio page
 * already uses. Reusing it rather than recomputing keeps one author for the
 * figure: a dashboard that arrived at its own total would eventually disagree
 * with the page it links to, and there would be no way to tell which was right.
 *
 * Scoping is by context, not by prop — see WidgetScope in the frame.
 */
export function PortfolioValueWidget({ title }: WidgetProps) {
  return (
    <Card className="h-full">
      <CardContent className="pt-6">
        <p className="text-xs text-muted-foreground mb-3">{title}</p>
        <PortfolioValueHeader />
      </CardContent>
    </Card>
  )
}
