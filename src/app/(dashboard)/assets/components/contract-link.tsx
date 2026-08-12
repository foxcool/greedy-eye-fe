'use client'

import { contractUrl, truncateAddress, type ContractRef } from '@/lib/assets/links'

/**
 * A contract address, linked to its chain's explorer when the chain is known.
 *
 * When it is not — an unlisted chain — the address stays on screen as plain
 * text. That is the point: a link into the wrong network is a claim about where
 * the token lives, and this table is exactly where a lookalike is told apart
 * from the asset it imitates.
 */
export function ContractLink({ contract }: { contract: ContractRef | undefined }) {
  if (!contract) return <>—</>

  const href = contractUrl(contract)
  const short = truncateAddress(contract.address)

  if (!href) return <span title={contract.address}>{short}</span>

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:text-primary"
      title={contract.address}
    >
      {short}
    </a>
  )
}
