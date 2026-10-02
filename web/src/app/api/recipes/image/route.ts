import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { processAndStoreRecipeImage } from '@/lib/recipe-image'

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
    const stored = await processAndStoreRecipeImage(Buffer.from(arrayBuffer))

    return NextResponse.json({
      image: {
        path: stored.path,
        mimeType: stored.mimeType,
        width: stored.width,
        height: stored.height,
        sizeBytes: stored.sizeBytes,
      },
    })
  } catch (err) {
    console.error('[recipes.image.post]', err)
    return NextResponse.json({ error: 'Could not process image.' }, { status: 500 })
  }
}
