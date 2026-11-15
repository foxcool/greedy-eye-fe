'use client'

import { ExternalLink } from 'lucide-react'
import { CopyButton } from '@/components/ui/copy-button'
import { contractUrl, type ContractRef } from '@/lib/assets/links'
import { cn } from '@/lib/utils'

/**
 * A contract in full, with copy and — where the chain allows one — an explorer
 * link. Shown beside an asset whose symbol is only a label cut from this
 * address (see `derivedLabelContract`), because the label alone cannot tell two
 * such tokens apart.
 *
 * Sits above a row's stretched card link (`relative z-10`) so copy and the
 * explorer link stay clickable inside asset rows.
 */
export function ContractAddress({ contract, className }: { contract: ContractRef; className?: string }) {
  const href = contractUrl(contract)
  return (
    <div className={cn('relative z-10 flex items-center gap-1', className)}>
      <code className="min-w-0 break-all font-mono text-xs text-muted-foreground">{contract.address}</code>
      <CopyButton value={contract.address} variant="ghost" size="sm" />
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          title={contract.chain ? `Explorer (${contract.chain})` : 'Search every explorer'}
          aria-label="Contract on a block explorer"
          className="inline-flex shrink-0 rounded p-1 text-muted-foreground hover:text-primary"
        >
          <ExternalLink size={14} aria-hidden="true" />
        </a>
      )}
    </div>
  )
}
