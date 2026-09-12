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

// One author for "is this link the current page": the rail and the strip render
// the same list in two shapes, and a second copy of this test is how the two
// come to disagree about where the user is.
function NavLink({
  href,
  label,
  className = '',
}: {
  href: string
  label: string
  className?: string
}) {
  const pathname = usePathname()
  const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={`rounded-lg text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors ${
        isActive ? 'bg-secondary' : 'hover:bg-secondary/60'
      } ${className}`}
    >
      {label}
    </Link>
  )
}

// The rail is 16rem of a screen that may only be 20rem wide, so below md it is
// not narrowed — it is replaced by the strip below. Narrowing would have kept
// the divider and lost the content it divides.
function Sidebar() {
  return (
    <aside className="hidden md:block w-64 shrink-0 border-r border-border bg-card">
      {/* Pinned below the 3.5rem header: navigation that scrolls away is not
          navigation. The rail itself stretches so the divider runs full height. */}
      <nav
        className="sticky top-14 max-h-[calc(100vh-3.5rem)] overflow-y-auto space-y-2 p-4"
        aria-label="Main navigation"
      >
        {NAV_LINKS.map(({ href, label }) => (
          <NavLink key={href} href={href} label={label} className="block px-3 py-2" />
        ))}
      </nav>
    </aside>
  )
}

// The small-screen form of the same rail: a row under the header, pinned for the
// same reason and scrolling sideways when six labels do not fit. Deliberately not
// a drawer — six short links cost less on screen than a button that hides them,
// and a strip has no open state to get wrong.
function NavStrip() {
  return (
    <nav
      className="md:hidden sticky top-14 z-40 flex gap-1 overflow-x-auto border-b border-border bg-card px-2 py-2"
      aria-label="Main navigation"
    >
      {NAV_LINKS.map(({ href, label }) => (
        <NavLink
          key={href}
          href={href}
          label={label}
          className="shrink-0 px-3 py-1.5 text-sm"
        />
      ))}
    </nav>
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
        <NavStrip />
        <div className="flex flex-1">
          <Sidebar />
          {/* min-w-0 is the whole fix for the page scrolling sideways: a flex
              item defaults to min-width:auto, so it refuses to shrink below its
              widest content and pushes the document past the viewport instead of
              letting that content scroll inside its own box. */}
          <main className="min-w-0 flex-1 p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}
