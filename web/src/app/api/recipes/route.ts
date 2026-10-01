import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import {
  ingredientRowKindToApi,
  mapInstructionRows,
  mapRecipeStatus,
  parseRecipePayload,
  resolveTagIds,
} from '@/lib/recipe-domain'

type SortField = 'updatedAt' | 'title'
type SortOrder = 'asc' | 'desc'

function parseSortField(value: string | null): SortField {
  return value === 'title' ? 'title' : 'updatedAt'
}

function parseSortOrder(value: string | null, sortBy: SortField): SortOrder {
  if (value === 'asc' || value === 'desc') return value
  return sortBy === 'updatedAt' ? 'desc' : 'asc'
}

async function getRecipeForResponse(recipeId: string, householdId: string) {
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
      cookbook: {
        select: {
          id: true,
          name: true,
        },
      },
      ingredientRows: {
        orderBy: { position: 'asc' },
        select: {
          id: true,
          position: true,
          kind: true,
          heading: true,
          quantity: true,
          note: true,
          ingredient: {
            select: {
              id: true,
              name: true,
            },
          },
          unit: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      tagsOnRecipes: {
        select: {
          tag: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  })
}

export async function GET(req: NextRequest) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  try {
    const sortBy = parseSortField(req.nextUrl.searchParams.get('sortBy'))
    const order = parseSortOrder(req.nextUrl.searchParams.get('order'), sortBy)
    const status = req.nextUrl.searchParams.get('status')

    const recipes = await prisma.recipe.findMany({
      where: {
        householdId: session.householdId,
        ...(status === 'draft' ? { status: 'DRAFT' } : {}),
        ...(status === 'published' ? { status: 'PUBLISHED' } : {}),
      },
      orderBy: [
        { [sortBy]: order },
        { createdAt: 'desc' },
      ],
      select: {
        id: true,
        title: true,
        status: true,
        servings: true,
        prepMinutes: true,
        cookMinutes: true,
        sourceUrl: true,
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
        cookbook: {
          select: {
            id: true,
            name: true,
          },
        },
        tagsOnRecipes: {
          select: {
            tag: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        _count: {
          select: {
            ingredientRows: true,
          },
        },
      },
    })

    return NextResponse.json({
      recipes: recipes.map((recipe) => ({
        ...recipe,
        status: mapRecipeStatus(recipe.status),
        tags: recipe.tagsOnRecipes.map((entry) => entry.tag),
        ingredientRowCount: recipe._count.ingredientRows,
      })),
    })
  } catch (err) {
    console.error('[recipes.get]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const payload = parseRecipePayload(body)
    const shouldPublish = body?.publish === true

    if (payload.cookbookId) {
      const cookbook = await prisma.cookbook.findFirst({
        where: {
          id: payload.cookbookId,
          householdId: session.householdId,
        },
        select: { id: true },
      })

      if (!cookbook) {
        return NextResponse.json({ error: 'Cookbook not found.' }, { status: 404 })
      }
    }

    const ingredientIds = payload.ingredientRows
      .map((row) => row.ingredientId)
      .filter((value): value is string => Boolean(value))
    const unitIds = payload.ingredientRows
      .map((row) => row.unitId)
      .filter((value): value is string => Boolean(value))

    const [ingredients, units] = await Promise.all([
      ingredientIds.length
        ? prisma.ingredient.findMany({
          where: {
            householdId: session.householdId,
            id: { in: ingredientIds },
          },
          select: { id: true },
        })
        : Promise.resolve([]),
      unitIds.length
        ? prisma.unit.findMany({
          where: {
            householdId: session.householdId,
            id: { in: unitIds },
          },
          select: { id: true },
        })
        : Promise.resolve([]),
    ])

    if (ingredients.length !== new Set(ingredientIds).size) {
      return NextResponse.json({ error: 'One or more ingredients are invalid.' }, { status: 400 })
    }

    if (units.length !== new Set(unitIds).size) {
      return NextResponse.json({ error: 'One or more units are invalid.' }, { status: 400 })
    }

    const createdRecipeId = await prisma.$transaction(async (tx) => {
      const tagIds = await resolveTagIds(tx, session.householdId, payload.tagNames)

      const recipe = await tx.recipe.create({
        data: {
          householdId: session.householdId,
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
          lastAutosavedAt: new Date(),
          ingredientRows: {
            create: payload.ingredientRows.map((row, index) => ({
              position: index,
              kind: row.kind === 'heading' ? 'HEADING' : 'ITEM',
              heading: row.kind === 'heading' ? row.heading : null,
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
        select: { id: true },
      })

      return recipe.id
    })

    const created = await getRecipeForResponse(createdRecipeId, session.householdId)
    if (!created) {
      return NextResponse.json({ error: 'Recipe not found.' }, { status: 404 })
    }

    return NextResponse.json({
      recipe: {
        ...created,
        status: mapRecipeStatus(created.status),
        instructions: mapInstructionRows(created.instructions),
        ingredientRows: created.ingredientRows.map((row) => ({
          id: row.id,
          position: row.position,
          kind: ingredientRowKindToApi(row.kind),
          heading: row.heading,
          quantity: row.quantity,
          note: row.note,
          ingredient: row.ingredient,
          unit: row.unit,
        })),
        tags: created.tagsOnRecipes.map((entry) => entry.tag),
      },
    })
  } catch (err) {
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    console.error('[recipes.post]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
