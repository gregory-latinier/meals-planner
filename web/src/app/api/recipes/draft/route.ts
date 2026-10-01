import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

export async function POST() {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  try {
    const now = new Date()
    const recipe = await prisma.recipe.create({
      data: {
        householdId: session.householdId,
        title: '',
        status: 'DRAFT',
        instructions: [],
        draftSavedAt: now,
        lastAutosavedAt: now,
      },
      select: {
        id: true,
        status: true,
        autosaveVersion: true,
        draftSavedAt: true,
        lastAutosavedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      recipe: {
        ...recipe,
        status: 'draft',
      },
    })
  } catch (err) {
    console.error('[recipes.draft.post]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
