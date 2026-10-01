import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'
import { MAX_UNIT_NAME_LENGTH, normalizeLower } from '@/lib/recipe-domain'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const query = req.nextUrl.searchParams.get('q')?.trim() ?? ''

  const units = await prisma.unit.findMany({
    where: {
      householdId: session.householdId,
      ...(query
        ? {
          nameNormalized: {
            contains: normalizeLower(query),
          },
        }
        : {}),
    },
    orderBy: [{ name: 'asc' }],
    take: 20,
    select: {
      id: true,
      name: true,
    },
  })

  return NextResponse.json({ units })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const body = await req.json()
  const name = typeof body?.name === 'string' ? body.name.trim() : ''

  if (!name) {
    return NextResponse.json({ error: 'Unit name is required.' }, { status: 400 })
  }

  if (name.length > MAX_UNIT_NAME_LENGTH) {
    return NextResponse.json({ error: `Unit name must be ${MAX_UNIT_NAME_LENGTH} characters or fewer.` }, { status: 400 })
  }

  const normalized = normalizeLower(name)

  const unit = await prisma.unit.upsert({
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
      name: true,
    },
  })

  return NextResponse.json({ unit })
}
