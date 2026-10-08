const FALLBACK_NEXT_PATH = '/recipes'

export function getSafeNextPath(candidate: string | null | undefined): string {
  if (!candidate) return FALLBACK_NEXT_PATH

  const trimmed = candidate.trim()
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return FALLBACK_NEXT_PATH
  }

  try {
    const parsed = new URL(trimmed, 'http://localhost')
    if (parsed.origin !== 'http://localhost') {
      return FALLBACK_NEXT_PATH
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return FALLBACK_NEXT_PATH
  }
}
