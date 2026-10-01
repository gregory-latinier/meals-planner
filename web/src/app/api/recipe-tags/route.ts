import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { MAX_TAG_LENGTH, normalizeLower } from '@/lib/recipe-domain'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const contains = req.nextUrl.searchParams.get('q')?.trim() ?? ''

  const tags = await prisma.recipeTag.findMany({
    where: {
      householdId: session.householdId,
      ...(contains
        ? {
          nameNormalized: {
            contains: normalizeLower(contains),
          },
        }
        : {}),
    },
    orderBy: [
      { name: 'asc' },
      { createdAt: 'asc' },
    ],
    take: 20,
    select: {
      id: true,
      name: true,
    },
  })

  return NextResponse.json({ tags })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const body = await req.json()
  const rawName = typeof body?.name === 'string' ? body.name.trim() : ''
  const name = normalizeLower(rawName)

  if (!name) {
    return NextResponse.json({ error: 'Tag name is required.' }, { status: 400 })
  }

  if (name.length > MAX_TAG_LENGTH) {
    return NextResponse.json({ error: `Tag name must be ${MAX_TAG_LENGTH} characters or fewer.` }, { status: 400 })
  }

  const tag = await prisma.recipeTag.upsert({
    where: {
      householdId_nameNormalized: {
        householdId: session.householdId,
        nameNormalized: normalizeLower(name),
      },
    },
    create: {
      householdId: session.householdId,
      name,
      nameNormalized: normalizeLower(name),
    },
    update: {
      name,
    },
    select: {
      id: true,
      name: true,
    },
  })

  return NextResponse.json({ tag })
}
