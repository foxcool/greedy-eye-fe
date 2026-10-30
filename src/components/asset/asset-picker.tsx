'use client'

import { useId, useState } from 'react'
import { Input } from '@/components/ui/input'
import { useAssetSearch } from '@/hooks/use-assets'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import type { Asset } from '@/lib/api/backend-types'

// One server page; a picker is for landing on a known asset, not browsing.
const SEARCH_LIMIT = 50

export function assetLabel(a: Pick<Asset, 'symbol' | 'name'>): string {
  return a.symbol ? `${a.symbol.toUpperCase()} — ${a.name}` : a.name
}

/**
 * Picks one asset from the catalogue by a server-side search. The catalogue is
 * never loaded into the browser — thousands of rows, most of them airdropped
 * litter — so the picker shows only what matches what is typed.
 *
 * It holds no selection: the caller labels what was picked, because only the
 * caller knows whether the choice is a form field or a new row.
 */
export function AssetPicker({
  onSelect,
  exclude,
  placeholder = 'Search asset by name, symbol or contract…',
  className,
  'aria-label': ariaLabel = 'Search assets',
}: {
  onSelect: (asset: Asset) => void
  /** Ids that are already chosen and should not be offered again. */
  exclude?: ReadonlySet<string>
  placeholder?: string
  className?: string
  'aria-label'?: string
}) {
  const listId = useId()
  const [search, setSearch] = useState('')
  const query = useDebouncedValue(search, 300)
  const searching = search.trim().length >= 2
  const results = useAssetSearch(searching ? query : '', undefined, SEARCH_LIMIT)
  const options = (results.data?.assets ?? []).filter((a) => !exclude?.has(a.id))
  // The debounce gap counts as searching: otherwise the box flashes "No assets
  // match" before it has asked.
  const pending = results.isLoading || (searching && query !== search && !results.data)
  const pick = (a: Asset) => {
    onSelect(a)
    setSearch('')
  }

  return (
    <div className={className}>
      <Input
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={searching}
        aria-controls={listId}
        placeholder={placeholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        // Enter picks nothing here; inside a form it would submit it half-filled.
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.preventDefault()
        }}
      />
      {searching && (
        <div className="mt-1 max-h-60 overflow-y-auto rounded-md border border-border">
          {pending ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Searching…</p>
          ) : results.error ? (
            <p className="px-3 py-2 text-sm text-destructive">Search failed: {results.error.message}</p>
          ) : options.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">No assets match.</p>
          ) : (
            <ul id={listId} role="listbox" aria-label={ariaLabel}>
              {options.map((a) => (
                <li
                  key={a.id}
                  role="option"
                  aria-selected={false}
                  tabIndex={0}
                  className="cursor-pointer px-3 py-1.5 text-sm hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
                  onClick={() => pick(a)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      pick(a)
                    }
                  }}
                >
                  {assetLabel(a)}
                </li>
              ))}
            </ul>
          )}
          {results.data?.truncated && (
            <p className="border-t border-border px-3 py-1.5 text-xs text-muted-foreground">
              More assets match than one search returns — narrow it.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
