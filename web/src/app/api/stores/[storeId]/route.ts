import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/session'

const MAX_NAME_LENGTH = 500
const CUID_REGEX = /^c[a-z0-9]{24}$/

interface RouteParams {
  params: Promise<{ storeId: string }>
}

function normalizeStoreName(name: string): string {
  return name.trim().toLocaleLowerCase()
}

function isValidStoreId(storeId: string): boolean {
  return CUID_REGEX.test(storeId)
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { storeId } = await params

  if (!isValidStoreId(storeId)) {
    return NextResponse.json({ error: 'Invalid storeId.' }, { status: 400 })
  }

  try {
    const existing = await prisma.store.findFirst({
      where: {
        id: storeId,
        householdId: session.householdId,
      },
      select: {
        id: true,
        name: true,
        nameNormalized: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Store not found.' }, { status: 404 })
    }

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

    const nameNormalized = normalizeStoreName(name)

    if (existing.name === name && existing.nameNormalized === nameNormalized) {
      return NextResponse.json({
        store: {
          id: existing.id,
          name: existing.name,
          createdAt: existing.createdAt,
          updatedAt: existing.updatedAt,
        },
      })
    }

    const updated = await prisma.store.update({
      where: { id: existing.id },
      data: {
        name,
        nameNormalized,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({ store: updated })
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      return NextResponse.json({ error: 'A store with this name already exists.' }, { status: 409 })
    }

    console.error('[stores.patch]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, { params }: RouteParams) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const { storeId } = await params

  if (!isValidStoreId(storeId)) {
    return NextResponse.json({ error: 'Invalid storeId.' }, { status: 400 })
  }

  try {
    const existing = await prisma.store.findFirst({
      where: {
        id: storeId,
        householdId: session.householdId,
      },
      select: {
        id: true,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Store not found.' }, { status: 404 })
    }

    await prisma.store.delete({
      where: { id: existing.id },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[stores.delete]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
