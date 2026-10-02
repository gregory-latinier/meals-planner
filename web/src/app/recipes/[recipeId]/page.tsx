import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import RecipeViewClient from './RecipeViewClient'

interface RecipeViewPageProps {
  params: Promise<{ recipeId: string }>
}

export default async function RecipeViewPage({ params }: RecipeViewPageProps) {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  const { recipeId } = await params
  return <RecipeViewClient recipeId={recipeId} />
}
