'use client'

import { ThemeToggle } from '@/components/theme-toggle'

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4">
        <div className="flex flex-1 items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-foreground">Greedy Eye</h1>
          </div>

          <nav className="flex items-center gap-4">
            <ThemeToggle />
          </nav>
        </div>
      </div>
    </header>
  )
}
