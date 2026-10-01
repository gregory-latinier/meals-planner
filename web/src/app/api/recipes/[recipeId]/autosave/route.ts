import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { isValidCuid, parseRecipePayload, resolveTagIds } from '@/lib/recipe-domain'

interface RouteParams {
  params: Promise<{ recipeId: string }>
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { recipeId } = await params
  if (!isValidCuid(recipeId)) {
    return NextResponse.json({ error: 'Invalid recipeId.' }, { status: 400 })
  }

  const existing = await prisma.recipe.findFirst({
    where: { id: recipeId, householdId: session.householdId },
    select: { id: true, autosaveVersion: true },
  })

  if (!existing) {
    return NextResponse.json({ error: 'Recipe not found.' }, { status: 404 })
  }

  try {
    const body = await req.json()
    const payload = parseRecipePayload(body, { allowEmptyTitle: true, allowIncompleteItems: true })

    const saved = await prisma.$transaction(async (tx) => {
      if (payload.cookbookId) {
        const cookbook = await tx.cookbook.findFirst({
          where: { id: payload.cookbookId, householdId: session.householdId },
          select: { id: true },
        })

        if (!cookbook) {
          throw new Error('Cookbook not found.')
        }
      }

      const ingredientIds = payload.ingredientRows
        .map((row) => row.ingredientId)
        .filter((value): value is string => Boolean(value))
      const unitIds = payload.ingredientRows
        .map((row) => row.unitId)
        .filter((value): value is string => Boolean(value))

      if (ingredientIds.length) {
        const ingredients = await tx.ingredient.findMany({
          where: { householdId: session.householdId, id: { in: ingredientIds } },
          select: { id: true },
        })

        if (ingredients.length !== new Set(ingredientIds).size) {
          throw new Error('One or more ingredients are invalid.')
        }
      }

      if (unitIds.length) {
        const units = await tx.unit.findMany({
          where: { householdId: session.householdId, id: { in: unitIds } },
          select: { id: true },
        })

        if (units.length !== new Set(unitIds).size) {
          throw new Error('One or more units are invalid.')
        }
      }

      const tagIds = await resolveTagIds(tx, session.householdId, payload.tagNames)

      await tx.recipeTagOnRecipe.deleteMany({ where: { recipeId } })
      await tx.recipeIngredientRow.deleteMany({ where: { recipeId } })

      return tx.recipe.update({
        where: { id: recipeId },
        data: {
          cookbookId: payload.cookbookId,
          title: payload.title,
          servings: payload.servings,
          prepMinutes: payload.prepMinutes,
          cookMinutes: payload.cookMinutes,
          sourceUrl: payload.sourceUrl,
          instructions: payload.instructions as unknown as Prisma.InputJsonValue,
          imagePath: payload.imagePath,
          imageMimeType: payload.imageMimeType,
          imageWidth: payload.imageWidth,
          imageHeight: payload.imageHeight,
          imageSizeBytes: payload.imageSizeBytes,
          draftSavedAt: new Date(),
          lastAutosavedAt: new Date(),
          autosaveVersion: { increment: 1 },
          ingredientRows: {
            create: payload.ingredientRows.map((row, index) => ({
              position: index,
              kind: row.kind === 'heading' ? 'HEADING' : 'ITEM',
              heading: row.kind === 'heading' ? row.heading ?? null : null,
              ingredientId: row.kind === 'item' ? row.ingredientId ?? null : null,
              quantity: row.kind === 'item' ? row.quantity ?? null : null,
              unitId: row.kind === 'item' ? row.unitId ?? null : null,
              note: row.kind === 'item' ? row.note ?? null : null,
            })),
          },
          tagsOnRecipes: {
            create: tagIds.map((tagId) => ({ tagId })),
          },
        },
        select: {
          id: true,
          autosaveVersion: true,
          lastAutosavedAt: true,
          draftSavedAt: true,
          updatedAt: true,
        },
      })
    })

    return NextResponse.json({ recipe: saved })
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'Cookbook not found.') {
        return NextResponse.json({ error: err.message }, { status: 404 })
      }
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    console.error('[recipes.autosave.patch]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
