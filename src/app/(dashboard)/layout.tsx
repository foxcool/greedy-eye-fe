'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { ProtectedRoute } from '@/lib/auth/protected-route'

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <button
        className="px-3 py-1 bg-gray-300 rounded"
        aria-label="Loading theme"
        disabled
      >
        ...
      </button>
    )
  }

  const nextTheme = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark'
  const label = theme === 'dark' ? '🌙' : theme === 'light' ? '☀️' : '🖥️'

  return (
    <button
      onClick={() => setTheme(nextTheme)}
      aria-label={`Switch to ${nextTheme} theme`}
      className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 rounded-md text-sm font-medium text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {label} {theme}
    </button>
  )
}

function Header() {
  const { email, logout } = useAuth()
  const router = useRouter()

  async function handleLogout() {
    await logout()
    router.replace('/login')
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card h-14">
      <div className="flex h-full items-center justify-between px-4">
        <h1 className="text-xl font-semibold text-foreground">Greedy Eye</h1>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {email && (
            <span className="text-sm text-muted-foreground hidden sm:block">{email}</span>
          )}
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 bg-secondary hover:bg-secondary/80 rounded-md text-sm font-medium text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}

function Sidebar() {
  return (
    <aside className="w-64 border-r border-border bg-card p-4">
      <nav className="space-y-2" aria-label="Main navigation">
        <Link href="/" className="block px-3 py-2 rounded-lg bg-secondary text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Dashboard</Link>
        <Link href="/portfolios" className="block px-3 py-2 rounded-lg hover:bg-secondary text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Portfolios</Link>
        <Link href="/assets" className="block px-3 py-2 rounded-lg hover:bg-secondary text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Assets</Link>
      </nav>
    </aside>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 p-6">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
