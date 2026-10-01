import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import {
  ingredientRowKindToApi,
  isValidCuid,
  mapInstructionRows,
  mapRecipeStatus,
  parseRecipePayload,
  resolveTagIds,
} from '@/lib/recipe-domain'

interface RouteParams {
  params: Promise<{ recipeId: string }>
}

async function getRecipeForHousehold(recipeId: string, householdId: string) {
  return prisma.recipe.findFirst({
    where: { id: recipeId, householdId },
    select: {
      id: true,
      title: true,
      status: true,
      servings: true,
      prepMinutes: true,
      cookMinutes: true,
      sourceUrl: true,
      instructions: true,
      imagePath: true,
      imageMimeType: true,
      imageWidth: true,
      imageHeight: true,
      imageSizeBytes: true,
      draftSavedAt: true,
      lastAutosavedAt: true,
      autosaveVersion: true,
      publishedAt: true,
      createdAt: true,
      updatedAt: true,
      cookbook: { select: { id: true, name: true } },
      ingredientRows: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          position: true,
          kind: true,
          heading: true,
          quantity: true,
          note: true,
          ingredient: { select: { id: true, name: true } },
          unit: { select: { id: true, name: true } },
        },
      },
      tagsOnRecipes: {
        select: {
          tag: {
            select: { id: true, name: true },
          },
        },
      },
    },
  })
}

function toRecipeResponse(recipe: NonNullable<Awaited<ReturnType<typeof getRecipeForHousehold>>>) {
  return {
    ...recipe,
    status: mapRecipeStatus(recipe.status),
    instructions: mapInstructionRows(recipe.instructions),
    ingredientRows: recipe.ingredientRows.map((row) => ({
      id: row.id,
      position: row.position,
      kind: ingredientRowKindToApi(row.kind),
      heading: row.heading,
      quantity: row.quantity,
      note: row.note,
      ingredient: row.ingredient,
      unit: row.unit,
    })),
    tags: recipe.tagsOnRecipes.map((entry) => entry.tag),
  }
}

export async function GET(_: NextRequest, { params }: RouteParams) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { recipeId } = await params
  if (!isValidCuid(recipeId)) {
    return NextResponse.json({ error: 'Invalid recipeId.' }, { status: 400 })
  }

  const recipe = await getRecipeForHousehold(recipeId, session.householdId)
  if (!recipe) {
    return NextResponse.json({ error: 'Recipe not found.' }, { status: 404 })
  }

  return NextResponse.json({ recipe: toRecipeResponse(recipe) })
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
    select: { id: true },
  })

  if (!existing) {
    return NextResponse.json({ error: 'Recipe not found.' }, { status: 404 })
  }

  try {
    const body = await req.json()
    const shouldPublish = body?.publish === true
    const payload = parseRecipePayload(body, {
      allowEmptyTitle: !shouldPublish,
    })

    await prisma.$transaction(async (tx) => {
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

      await tx.recipe.update({
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
          status: shouldPublish ? 'PUBLISHED' : 'DRAFT',
          publishedAt: shouldPublish ? new Date() : null,
          draftSavedAt: new Date(),
        },
      })

      if (payload.ingredientRows.length) {
        await tx.recipeIngredientRow.createMany({
          data: payload.ingredientRows.map((row, index) => ({
            recipeId,
            position: index,
            kind: row.kind === 'heading' ? 'HEADING' : 'ITEM',
            heading: row.kind === 'heading' ? row.heading ?? null : null,
            ingredientId: row.kind === 'item' ? row.ingredientId ?? null : null,
            quantity: row.kind === 'item' ? row.quantity ?? null : null,
            unitId: row.kind === 'item' ? row.unitId ?? null : null,
            note: row.kind === 'item' ? row.note ?? null : null,
          })),
        })
      }

      if (tagIds.length) {
        await tx.recipeTagOnRecipe.createMany({
          data: tagIds.map((tagId) => ({ recipeId, tagId })),
          skipDuplicates: true,
        })
      }

    })

    const updated = await getRecipeForHousehold(recipeId, session.householdId)

    if (!updated) {
      return NextResponse.json({ error: 'Recipe not found.' }, { status: 404 })
    }

    return NextResponse.json({ recipe: toRecipeResponse(updated) })
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'Cookbook not found.') {
        return NextResponse.json({ error: err.message }, { status: 404 })
      }
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    console.error('[recipes.patch]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: RouteParams) {
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
    select: { id: true },
  })

  if (!existing) {
    return NextResponse.json({ error: 'Recipe not found.' }, { status: 404 })
  }

  await prisma.recipe.delete({ where: { id: recipeId } })
  return NextResponse.json({ success: true })
}
