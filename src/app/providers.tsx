'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ThemeProvider, useTheme } from 'next-themes'
import { useState, useEffect } from 'react'
import { makeQueryClient } from '@/lib/config/query-client'
import { AuthProvider } from '@/lib/auth/auth-context'
import { useUIStyle } from '@/components/style-provider'

function ThemeColorMeta() {
  const { resolvedTheme } = useTheme()
  const { style } = useUIStyle()

  useEffect(() => {
    // Background depends on both axes (style × scheme). Read it a frame later:
    // next-themes applies the .dark class in a parent effect that runs after
    // this child effect, so a synchronous read would see the previous scheme.
    const id = requestAnimationFrame(() => {
      const themeColor = getComputedStyle(document.documentElement)
        .getPropertyValue('--background')
        .trim()

      let meta = document.querySelector('meta[name="theme-color"]')
      if (!meta) {
        meta = document.createElement('meta')
        meta.setAttribute('name', 'theme-color')
        document.head.appendChild(meta)
      }
      meta.setAttribute('content', themeColor)

      document.documentElement.style.colorScheme = resolvedTheme === 'dark' ? 'dark' : 'light'
    })
    return () => cancelAnimationFrame(id)
  }, [resolvedTheme, style])

  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => makeQueryClient())

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
    >
      <ThemeColorMeta />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          {children}
        </AuthProvider>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </ThemeProvider>
  )
}
