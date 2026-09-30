import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

type SortField = 'updatedAt' | 'name'
type SortOrder = 'asc' | 'desc'

const MAX_NAME_LENGTH = 500

function parseSortField(value: string | null): SortField {
  return value === 'name' ? 'name' : 'updatedAt'
}

function parseSortOrder(value: string | null, sortBy: SortField): SortOrder {
  if (value === 'asc' || value === 'desc') return value
  return sortBy === 'updatedAt' ? 'desc' : 'asc'
}

function normalizeStoreName(name: string): string {
  return name.trim().toLocaleLowerCase()
}

export async function GET(req: NextRequest) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  try {
    const sortBy = parseSortField(req.nextUrl.searchParams.get('sortBy'))
    const order = parseSortOrder(req.nextUrl.searchParams.get('order'), sortBy)

    const stores = await prisma.store.findMany({
      where: { householdId: session.householdId },
      orderBy: [
        { [sortBy]: order },
        { createdAt: 'desc' },
      ],
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ stores })
  } catch (err) {
    console.error('[stores.get]', err)
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
    const rawName = typeof body?.name === 'string' ? body.name : ''
    const name = rawName.trim()

    if (!name) {
      return NextResponse.json({ error: 'Store name is required.' }, { status: 400 })
    }

    if (name.length > MAX_NAME_LENGTH) {
      return NextResponse.json(
        { error: `Store name must be ${MAX_NAME_LENGTH} characters or fewer.` },
        { status: 400 }
      )
    }

    const store = await prisma.store.create({
      data: {
        householdId: session.householdId,
        name,
        nameNormalized: normalizeStoreName(name),
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ store })
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      return NextResponse.json({ error: 'A store with this name already exists.' }, { status: 409 })
    }

    console.error('[stores.post]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
