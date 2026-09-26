'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDeleteAsset, useUpdateAsset } from '@/hooks/use-assets'
import { useAuth } from '@/lib/auth/auth-context'
import type { Asset } from '@/lib/api/backend-types'
import { AssetForm } from '../../components/asset-form'

/**
 * Edit and delete for a catalogue entry, kept off the list on purpose.
 *
 * An asset is global — one row shared by every user who holds it — so these are
 * catalogue maintenance, not something to offer on each of seven thousand list
 * rows. Both are admin-only on the backend, so the menu is not rendered for
 * anyone else — an Edit that always answers PermissionDenied is a dead control.
 * Delete asks first: it removes the entry for everyone, not from the reader's view.
 */
export function AssetActions({ asset }: { asset: Asset }) {
  const { isAdmin } = useAuth()
  if (!isAdmin) return null
  return <AdminAssetActions asset={asset} />
}

function AdminAssetActions({ asset }: { asset: Asset }) {
  const router = useRouter()
  const update = useUpdateAsset()
  const remove = useDeleteAsset()
  const [editOpen, setEditOpen] = useState(false)

  const onDelete = () => {
    const label = asset.symbol ?? asset.name
    if (!window.confirm(`Delete ${label} from the catalogue? It disappears for every user.`)) return
    remove.mutate(asset.id, { onSuccess: () => router.push('/assets?tab=catalog') })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" aria-label="Asset actions">
            <MoreHorizontal size={16} aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>Edit</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            disabled={remove.isPending}
            onSelect={onDelete}
          >
            Delete from catalogue
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AssetForm
        open={editOpen}
        onOpenChange={setEditOpen}
        initial={asset}
        isLoading={update.isPending}
        onSubmit={(values) =>
          update.mutate({ ...values, id: asset.id }, { onSuccess: () => setEditOpen(false) })
        }
      />
    </>
  )
}
