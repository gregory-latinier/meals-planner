import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import CookbooksClient from './CookbooksClient'

export default async function CookbooksPage() {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  return <CookbooksClient />
}
