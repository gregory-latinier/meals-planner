import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { MAX_INGREDIENT_NAME_LENGTH, normalizeLower } from '@/lib/recipe-domain'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const query = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  const locale = req.nextUrl.searchParams.get('locale')?.trim() ?? ''

  const ingredients = await prisma.ingredient.findMany({
    where: {
      householdId: session.householdId,
      ...(query
        ? {
          OR: [
            {
              nameNormalized: {
                contains: normalizeLower(query),
              },
            },
            {
              translations: {
                some: {
                  ...(locale ? { locale } : {}),
                  nameNormalized: {
                    contains: normalizeLower(query),
                  },
                },
              },
            },
          ],
        }
        : {}),
    },
    orderBy: [{ name: 'asc' }],
    take: 20,
    select: {
      id: true,
      name: true,
      translations: {
        where: locale ? { locale } : undefined,
        select: {
          locale: true,
          name: true,
        },
      },
    },
  })

  return NextResponse.json({ ingredients })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const body = await req.json()
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const locale = typeof body?.locale === 'string' ? body.locale.trim() : ''

  if (!name) {
    return NextResponse.json({ error: 'Ingredient name is required.' }, { status: 400 })
  }

  if (name.length > MAX_INGREDIENT_NAME_LENGTH) {
    return NextResponse.json(
      { error: `Ingredient name must be ${MAX_INGREDIENT_NAME_LENGTH} characters or fewer.` },
      { status: 400 }
    )
  }

  const normalized = normalizeLower(name)

  const ingredient = await prisma.$transaction(async (tx) => {
    const entity = await tx.ingredient.upsert({
      where: {
        householdId_nameNormalized: {
          householdId: session.householdId,
          nameNormalized: normalized,
        },
      },
      create: {
        householdId: session.householdId,
        name,
        nameNormalized: normalized,
      },
      update: {
        name,
      },
      select: {
        id: true,
      },
    })

    if (locale) {
      await tx.ingredientTranslation.upsert({
        where: {
          ingredientId_locale: {
            ingredientId: entity.id,
            locale,
          },
        },
        create: {
          ingredientId: entity.id,
          locale,
          name,
          nameNormalized: normalized,
        },
        update: {
          name,
          nameNormalized: normalized,
        },
      })
    }

    return tx.ingredient.findUnique({
      where: { id: entity.id },
      select: {
        id: true,
        name: true,
        translations: {
          where: locale ? { locale } : undefined,
          select: {
            locale: true,
            name: true,
          },
        },
      },
    })
  })

  return NextResponse.json({ ingredient })
}
