import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import RecipesClient from './RecipesClient'

export default async function RecipesPage() {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  return <RecipesClient />
}
