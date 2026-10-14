export type InstagramShareValidationError =
  | 'required'
  | 'invalidUrl'
  | 'notInstagramHost'
  | 'unsupportedInstagramPath'

export interface InstagramShareValidationResult {
  ok: boolean
  normalizedUrl: string | null
  error: InstagramShareValidationError | null
}

const ALLOWED_INSTAGRAM_HOSTS = new Set(['instagram.com', 'www.instagram.com', 'm.instagram.com'])

function isSupportedInstagramPath(pathname: string): boolean {
  return /^\/(p|reel|tv)\/[A-Za-z0-9_-]+\/?$/u.test(pathname)
}

export function validateInstagramShareUrl(candidate: string | null | undefined): InstagramShareValidationResult {
  if (!candidate) {
    return { ok: false, normalizedUrl: null, error: 'required' }
  }

  const trimmed = candidate.trim()
  if (!trimmed) {
    return { ok: false, normalizedUrl: null, error: 'required' }
  }

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return { ok: false, normalizedUrl: null, error: 'invalidUrl' }
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, normalizedUrl: null, error: 'invalidUrl' }
  }

  const hostname = parsed.hostname.toLowerCase()
  if (!ALLOWED_INSTAGRAM_HOSTS.has(hostname)) {
    return { ok: false, normalizedUrl: null, error: 'notInstagramHost' }
  }

  if (!isSupportedInstagramPath(parsed.pathname)) {
    return { ok: false, normalizedUrl: null, error: 'unsupportedInstagramPath' }
  }

  return { ok: true, normalizedUrl: parsed.toString(), error: null }
}

export function extractSharedUrlFromText(text: string): string | null {
  const match = text.match(/https?:\/\/\S+/iu)
  return match ? match[0] : null
}
