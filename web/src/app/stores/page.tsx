import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import StoresClient from './StoresClient'

export default async function StoresPage() {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  return <StoresClient />
}
