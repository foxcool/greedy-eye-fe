'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

/**
 * Copies a value and says so for a moment. The confirmation is the point: a
 * clipboard write leaves no trace on screen, so without it the user cannot tell
 * a successful copy from a click that missed.
 */
export function CopyButton({
  value,
  label = 'Copy',
  variant = 'outline',
  size = 'sm',
}: {
  value: string
  label?: string
  variant?: React.ComponentProps<typeof Button>['variant']
  size?: React.ComponentProps<typeof Button>['size']
}) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={async () => {
        // The clipboard is refused on an insecure origin or without permission;
        // saying so beats a click that seems to do nothing.
        try {
          await navigator.clipboard.writeText(value)
          setState('copied')
        } catch {
          setState('failed')
        }
        setTimeout(() => setState('idle'), 1500)
      }}
    >
      {state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : label}
    </Button>
  )
}
