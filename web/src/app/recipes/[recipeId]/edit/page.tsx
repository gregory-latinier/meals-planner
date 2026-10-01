import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import RecipeEditorClient from './RecipeEditorClient'

interface RecipeEditPageProps {
  params: Promise<{ recipeId: string }>
}

export default async function RecipeEditPage({ params }: RecipeEditPageProps) {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  const { recipeId } = await params
  return <RecipeEditorClient recipeId={recipeId} />
}
