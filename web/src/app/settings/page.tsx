import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  return <SettingsClient />
}
