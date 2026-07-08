'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useIsFetching, useIsMutating } from '@tanstack/react-query'
import { useAuth } from '@/lib/auth/auth-context'
import { ProtectedRoute } from '@/lib/auth/protected-route'
import { GreedyEyeLogo } from '@/components/brand/greedy-eye-logo'
import { ThemeToggle } from '@/components/theme-toggle'

function Header() {
  const { email, logout } = useAuth()
  const router = useRouter()
  // The eye wanders while anything is happening in the background.
  const isFetching = useIsFetching() > 0
  const isMutating = useIsMutating() > 0
  const busy = isFetching || isMutating

  async function handleLogout() {
    await logout()
    router.replace('/login')
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card h-14">
      <div className="flex h-full items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <GreedyEyeLogo state={busy ? 'wander' : 'idle'} size={26} />
          <h1 className="text-xl font-semibold text-foreground">Greedy Eye</h1>
        </div>
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

const NAV_LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/portfolios', label: 'Portfolios' },
  { href: '/rules', label: 'Rules' },
  { href: '/prices', label: 'Prices' },
  { href: '/assets', label: 'Assets' },
  { href: '/settings', label: 'Settings' },
]

function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="w-64 border-r border-border bg-card p-4">
      <nav className="space-y-2" aria-label="Main navigation">
        {NAV_LINKS.map(({ href, label }) => {
          const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`block px-3 py-2 rounded-lg text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors ${
                isActive ? 'bg-secondary' : 'hover:bg-secondary/60'
              }`}
            >
              {label}
            </Link>
          )
        })}
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
