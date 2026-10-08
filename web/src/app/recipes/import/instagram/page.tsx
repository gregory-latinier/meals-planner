import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { InstagramShareValidationError } from '@/lib/instagram-share'
import InstagramImportClient from './InstagramImportClient'

interface InstagramImportPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function readSearchParam(
  params: Record<string, string | string[] | undefined>,
  key: string
): string {
  const value = params[key]
  if (Array.isArray(value)) {
    return value[0] ?? ''
  }
  return typeof value === 'string' ? value : ''
}

function parseShareError(raw: string): InstagramShareValidationError | null {
  if (raw === 'required' || raw === 'invalidUrl' || raw === 'notInstagramHost' || raw === 'unsupportedInstagramPath') {
    return raw
  }

  return null
}

export default async function InstagramImportPage({ searchParams }: InstagramImportPageProps) {
  const session = await getSession()
  const params = await searchParams

  const sourceUrl = readSearchParam(params, 'sourceUrl')
  const shareError = parseShareError(readSearchParam(params, 'shareError'))

  if (!session) {
    const importPath = `/recipes/import/instagram${sourceUrl || shareError ? `?${new URLSearchParams({
      ...(sourceUrl ? { sourceUrl } : {}),
      ...(shareError ? { shareError } : {}),
    }).toString()}` : ''}`

    redirect(`/login?next=${encodeURIComponent(importPath)}`)
  }

  return <InstagramImportClient initialSourceUrl={sourceUrl} initialError={shareError} />
}
