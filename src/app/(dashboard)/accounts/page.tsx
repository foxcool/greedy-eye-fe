import { redirect } from 'next/navigation'

// Accounts now live under Settings; keep the old URL working.
export default function AccountsPage() {
  redirect('/settings')
}
