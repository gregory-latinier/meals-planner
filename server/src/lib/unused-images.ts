import { readdir, stat, unlink } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { query } from '../db/index'

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif'])

// A freshly uploaded image is not referenced by any recipe until the editor is saved,
// so recent files are never considered unused.
export const UNUSED_IMAGE_MIN_AGE_MS = 60 * 60 * 1000

export interface UnusedImage {
  urlPath: string
  diskPath: string
  sizeBytes: number
}

async function listFiles(dir: string): Promise<string[]> {
  let entries
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch {
    return []
  }

  const nested = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = join(dir, entry.name)
      return entry.isDirectory() ? listFiles(fullPath) : [fullPath]
    })
  )
  return nested.flat()
}

export async function findUnusedImages(uploadDir: string, now = Date.now()): Promise<UnusedImage[]> {
  // The upload directory is shared by all households, so compare against every recipe.
  const res = await query<{ imagePath: string }>(
    `SELECT DISTINCT "imagePath" FROM "Recipe" WHERE "imagePath" IS NOT NULL`
  )
  const referenced = new Set(res.rows.map((row) => row.imagePath))

  const files = await listFiles(uploadDir)
  const unused: UnusedImage[] = []

  for (const diskPath of files) {
    const extension = diskPath.slice(diskPath.lastIndexOf('.')).toLowerCase()
    if (!IMAGE_EXTENSIONS.has(extension)) continue

    const urlPath = `/uploads/${relative(uploadDir, diskPath).split(sep).join('/')}`
    if (referenced.has(urlPath)) continue

    const stats = await stat(diskPath)
    if (now - stats.mtimeMs < UNUSED_IMAGE_MIN_AGE_MS) continue

    unused.push({ urlPath, diskPath, sizeBytes: stats.size })
  }

  return unused
}

export async function deleteUnusedImages(
  uploadDir: string
): Promise<{ deletedCount: number; freedBytes: number; failedCount: number }> {
  const unused = await findUnusedImages(uploadDir)
  let deletedCount = 0
  let freedBytes = 0
  let failedCount = 0

  for (const image of unused) {
    try {
      await unlink(image.diskPath)
      deletedCount += 1
      freedBytes += image.sizeBytes
    } catch {
      failedCount += 1
    }
  }

  return { deletedCount, freedBytes, failedCount }
}
