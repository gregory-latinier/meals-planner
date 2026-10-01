import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

export async function POST(req: Request) {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('image')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Image file is required.' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image.' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const input = Buffer.from(arrayBuffer)

    const output = await sharp(input)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer({ resolveWithObject: true })

    const { data, info } = output
    const imageDir = join(process.cwd(), 'public', 'uploads', 'recipes')
    await mkdir(imageDir, { recursive: true })

    const filename = `${randomUUID()}.jpg`
    const diskPath = join(imageDir, filename)
    await writeFile(diskPath, data)

    return NextResponse.json({
      image: {
        path: `/uploads/recipes/${filename}`,
        mimeType: 'image/jpeg',
        width: info.width ?? null,
        height: info.height ?? null,
        sizeBytes: info.size,
      },
    })
  } catch (err) {
    console.error('[recipes.image.post]', err)
    return NextResponse.json({ error: 'Could not process image.' }, { status: 500 })
  }
}
