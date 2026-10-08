import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { extractSharedUrlFromText, validateInstagramShareUrl } from '@/lib/instagram-share'

function readStringField(value: FormDataEntryValue | null): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed || null
}

function getShareCandidate(formData: FormData): string | null {
  const urlField = readStringField(formData.get('url'))
  if (urlField) {
    return urlField
  }

  const textField = readStringField(formData.get('text'))
  if (textField) {
    return extractSharedUrlFromText(textField) ?? textField
  }

  return null
}

function buildImportUrl(req: NextRequest, sourceUrl: string | null, shareError?: string): URL {
  const importUrl = new URL('/recipes/import/instagram', req.url)

  if (sourceUrl) {
    importUrl.searchParams.set('sourceUrl', sourceUrl)
  }

  if (shareError) {
    importUrl.searchParams.set('shareError', shareError)
  }

  return importUrl
}

function buildLoginUrl(req: NextRequest, nextUrl: URL): URL {
  const loginUrl = new URL('/login', req.url)
  const nextPath = `${nextUrl.pathname}${nextUrl.search}`
  loginUrl.searchParams.set('next', nextPath)
  return loginUrl
}

export async function POST(req: NextRequest) {
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    const importUrl = buildImportUrl(req, null, 'invalidUrl')
    return NextResponse.redirect(importUrl, { status: 303 })
  }

  const sourceUrl = getShareCandidate(formData)
  const validation = validateInstagramShareUrl(sourceUrl)

  const importUrl = buildImportUrl(
    req,
    sourceUrl,
    validation.ok ? undefined : validation.error ?? undefined
  )

  const session = await getSession()
  if (!session) {
    const loginUrl = buildLoginUrl(req, importUrl)
    return NextResponse.redirect(loginUrl, { status: 303 })
  }

  return NextResponse.redirect(importUrl, { status: 303 })
}
