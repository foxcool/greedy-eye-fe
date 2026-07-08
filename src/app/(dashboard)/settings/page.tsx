'use client'

import { useAuth } from '@/lib/auth/auth-context'
import { AccountList } from '../accounts/components/account-list'
import { Appearance } from './components/appearance'
import { PatList } from './components/pat-list'

export default function SettingsPage() {
  const { email } = useAuth()

  return (
    <div className="space-y-10 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        {email && <p className="text-sm text-muted-foreground">{email}</p>}
      </div>

      <Appearance />

      <PatList />

      <AccountList />
    </div>
  )
}
