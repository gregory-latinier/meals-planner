import { NextRequest } from 'next/server'
import { POST } from '@/app/share-target/route'
import { getSession } from '@/lib/session'

jest.mock('@/lib/session', () => ({
  getSession: jest.fn(),
}))

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>

describe('share-target route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('redirects authenticated users to Instagram import confirmation with shared URL', async () => {
    mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)

    const formData = new FormData()
    formData.set('url', 'https://www.instagram.com/reel/abc123/')

    const req = new NextRequest('http://localhost/share-target', {
      method: 'POST',
      body: formData,
    })

    const res = await POST(req)
    expect(res.status).toBe(303)
    expect(res.headers.get('location')).toBe(
      'http://localhost/recipes/import/instagram?sourceUrl=https%3A%2F%2Fwww.instagram.com%2Freel%2Fabc123%2F'
    )
  })

  it('redirects unauthenticated users to login with next preserving sourceUrl', async () => {
    mockedGetSession.mockResolvedValueOnce(null)

    const formData = new FormData()
    formData.set('url', 'https://www.instagram.com/p/abc123/')

    const req = new NextRequest('http://localhost/share-target', {
      method: 'POST',
      body: formData,
    })

    const res = await POST(req)
    expect(res.status).toBe(303)
    expect(res.headers.get('location')).toBe(
      'http://localhost/login?next=%2Frecipes%2Fimport%2Finstagram%3FsourceUrl%3Dhttps%253A%252F%252Fwww.instagram.com%252Fp%252Fabc123%252F'
    )
  })

  it('redirects unauthenticated users to login with next preserving shareError', async () => {
    mockedGetSession.mockResolvedValueOnce(null)

    const formData = new FormData()

    const req = new NextRequest('http://localhost/share-target', {
      method: 'POST',
      body: formData,
    })

    const res = await POST(req)
    expect(res.status).toBe(303)
    expect(res.headers.get('location')).toBe(
      'http://localhost/login?next=%2Frecipes%2Fimport%2Finstagram%3FshareError%3Drequired'
    )
  })

  it('extracts URL from text payload when url field is empty', async () => {
    mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)

    const formData = new FormData()
    formData.set('text', 'Try this: https://www.instagram.com/reel/xyz789/?utm_source=ig_web_copy_link')

    const req = new NextRequest('http://localhost/share-target', {
      method: 'POST',
      body: formData,
    })

    const res = await POST(req)
    expect(res.status).toBe(303)
    expect(res.headers.get('location')).toContain(
      '/recipes/import/instagram?sourceUrl=https%3A%2F%2Fwww.instagram.com%2Freel%2Fxyz789%2F%3Futm_source%3Dig_web_copy_link'
    )
  })

  it('redirects with validation error when shared URL payload is missing', async () => {
    mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)

    const formData = new FormData()

    const req = new NextRequest('http://localhost/share-target', {
      method: 'POST',
      body: formData,
    })

    const res = await POST(req)
    expect(res.status).toBe(303)
    expect(res.headers.get('location')).toBe('http://localhost/recipes/import/instagram?shareError=required')
  })
})
