// The recipe source can be free text (e.g. a book page number), so only
// http(s) URLs should be rendered as links.
export function isHttpUrl(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed || /\s/.test(trimmed)) return false

  try {
    const { protocol } = new URL(trimmed)
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}
