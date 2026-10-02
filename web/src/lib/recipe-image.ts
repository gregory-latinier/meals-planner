import { randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import sharp from 'sharp'
import { assertSafeRemoteHttpUrl } from '@/lib/remote-url-safety'

const DEFAULT_IMAGE_DIR = join(process.cwd(), 'public', 'uploads', 'recipes')
const MAX_DOWNLOADED_IMAGE_BYTES = 8 * 1024 * 1024
const MAX_REDIRECTS = 5

export interface StoredRecipeImage {
  path: string
  mimeType: string
  width: number | null
  height: number | null
  sizeBytes: number
}

export async function processAndStoreRecipeImage(input: Buffer): Promise<StoredRecipeImage> {
  const output = await sharp(input)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer({ resolveWithObject: true })

  const { data, info } = output
  await mkdir(DEFAULT_IMAGE_DIR, { recursive: true })

  const filename = `${randomUUID()}.jpg`
  const diskPath = join(DEFAULT_IMAGE_DIR, filename)
  await writeFile(diskPath, data)

  return {
    path: `/uploads/recipes/${filename}`,
    mimeType: 'image/jpeg',
    width: info.width ?? null,
    height: info.height ?? null,
    sizeBytes: info.size,
  }
}

function parseContentLength(value: string | null): number | null {
  if (!value) return null
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return parsed
}

export async function downloadImageBuffer(url: string, timeoutMs = 10_000): Promise<Buffer> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    let currentUrl = await assertSafeRemoteHttpUrl(url, {
      disallowedHostErrorMessage: 'Image URL is not allowed.',
      dnsLookupErrorMessage: 'Could not download image.',
    })
    let res: Response | null = null

    for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
      res = await fetch(currentUrl, {
        method: 'GET',
        headers: {
          Accept: 'image/*',
        },
        signal: controller.signal,
        redirect: 'manual',
      })

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location')
        if (!location) {
          throw new Error('Could not download image.')
        }

        const redirectUrl = new URL(location, currentUrl).toString()
        currentUrl = await assertSafeRemoteHttpUrl(redirectUrl, {
          disallowedHostErrorMessage: 'Image URL is not allowed.',
          dnsLookupErrorMessage: 'Could not download image.',
        })
        continue
      }

      break
    }

    if (!res) {
      throw new Error('Could not download image.')
    }

    if (res.status >= 300 && res.status < 400) {
      throw new Error('Could not download image.')
    }

    if (!res.ok) {
      throw new Error('Could not download image.')
    }

    const contentType = res.headers.get('content-type')
    if (!contentType || !contentType.toLocaleLowerCase().startsWith('image/')) {
      throw new Error('Downloaded asset is not an image.')
    }

    const contentLength = parseContentLength(res.headers.get('content-length'))
    if (contentLength && contentLength > MAX_DOWNLOADED_IMAGE_BYTES) {
      throw new Error('Image is too large.')
    }

    const arrayBuffer = await res.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    if (buffer.byteLength > MAX_DOWNLOADED_IMAGE_BYTES) {
      throw new Error('Image is too large.')
    }

    return buffer
  } finally {
    clearTimeout(timeout)
  }
}
