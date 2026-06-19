'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
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

/**
 * One-time display of a freshly minted PAT plus a ready-to-paste MCP config.
 * The plaintext token is never retrievable again, so it stays visible until the
 * user dismisses the panel.
 */
export function PatCreatedPanel({ token, onDismiss }: { token: string; onDismiss: () => void }) {
  // Empty when the app talks to the backend via a relative proxy path.
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin : '')
  const snippet = `GREEDY_EYE_BACKEND_URL=${backendUrl}\nGREEDY_EYE_AUTH_TOKEN=${token}`

  return (
    <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-4 space-y-4">
      <div>
        <p className="text-sm font-medium text-foreground">Token created</p>
        <p className="text-sm text-muted-foreground">
          Copy it now — it won&apos;t be shown again.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <code className="flex-1 overflow-x-auto rounded-md bg-background border border-border px-3 py-2 text-sm font-mono">
          {token}
        </code>
        <CopyButton value={token} />
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">MCP server config (greedy-eye-mcp):</p>
        <div className="flex items-start gap-2">
          <pre className="flex-1 overflow-x-auto rounded-md bg-background border border-border px-3 py-2 text-xs font-mono whitespace-pre">
            {snippet}
          </pre>
          <CopyButton value={snippet} label="Copy env" />
        </div>
      </div>

      <Button type="button" size="sm" onClick={onDismiss}>
        Done
      </Button>
    </div>
  )
}
