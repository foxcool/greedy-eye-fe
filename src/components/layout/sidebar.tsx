'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Briefcase, Coins, Cog, ScrollText } from 'lucide-react'

const routes = [
  {
    label: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    label: 'Portfolios',
    href: '/portfolios',
    icon: Briefcase,
  },
  {
    label: 'Assets',
    href: '/assets',
    icon: Coins,
  },
  {
    label: 'Rules',
    href: '/rules',
    icon: ScrollText,
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: Cog,
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 border-r border-border bg-card">
      <div className="flex h-full flex-col gap-2">
        <div className="flex-1 overflow-auto py-4">
          <nav className="grid gap-1 px-2">
            {routes.map((route) => {
              const Icon = route.icon
              const isActive = pathname === route.href
              
              return (
                <Link
                  key={route.href}
                  href={route.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  )}
                >
                  <Icon size={18} />
                  {route.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
    </aside>
  )
}
