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
  const [copied, setCopied] = useState(false)
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={async () => {
        await navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      }}
    >
      {copied ? 'Copied' : label}
    </Button>
  )
}
