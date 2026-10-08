import { extractSharedUrlFromText, validateInstagramShareUrl } from '@/lib/instagram-share'

describe('instagram share URL validation', () => {
  it('accepts supported instagram reel URLs', () => {
    const result = validateInstagramShareUrl('https://www.instagram.com/reel/abc123/')
    expect(result).toEqual({
      ok: true,
      normalizedUrl: 'https://www.instagram.com/reel/abc123/',
      error: null,
    })
  })

  it('rejects non-instagram URLs', () => {
    const result = validateInstagramShareUrl('https://example.com/reel/abc123/')
    expect(result.ok).toBe(false)
    expect(result.error).toBe('notInstagramHost')
  })

  it('rejects instagram profile URLs that are not post/reel/tv targets', () => {
    const result = validateInstagramShareUrl('https://www.instagram.com/some-profile/')
    expect(result.ok).toBe(false)
    expect(result.error).toBe('unsupportedInstagramPath')
  })

  it('extracts first URL from shared text payload', () => {
    expect(extractSharedUrlFromText('Look here https://www.instagram.com/p/xyz123/?igsh=1')).toBe(
      'https://www.instagram.com/p/xyz123/?igsh=1'
    )
  })
})
