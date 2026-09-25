'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { assetCardHref } from '@/lib/assets/links'
import { cn } from '@/lib/utils'

/**
 * Opens the asset card. Without a card to open (demo mode) it renders its
 * children as plain content, so a caller never has to branch on the data source.
 *
 * `stretched` makes the whole enclosing row the hit area: the link's ::after
 * covers the nearest positioned ancestor, which the caller marks `relative`.
 * This keeps a real <a> in the DOM — cmd-click, middle-click and "copy link"
 * work — instead of an onClick on a <tr> that only ever navigates in place.
 * Other controls in that row sit above the overlay with `relative z-10`.
 *
 * Clicks do not propagate: the link lives inside rows that have their own click
 * behaviour (the holdings table expands a row to its sources).
 */
export function AssetLink({
  assetId,
  children,
  className,
  stretched = false,
  title,
}: {
  assetId: string | undefined
  children: ReactNode
  className?: string
  stretched?: boolean
  title?: string
}) {
  const href = assetCardHref(assetId)
  if (!href) return <>{children}</>

  return (
    <Link
      href={href}
      title={title}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm',
        stretched && 'after:absolute after:inset-0 after:content-[""]',
        className
      )}
    >
      {children}
    </Link>
  )
}
