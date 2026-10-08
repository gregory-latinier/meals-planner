import { NextRequest } from 'next/server'
import { middleware } from '@/middleware'

describe('middleware auth guard', () => {
  it('redirects unauthenticated requests to login with next path preserved', () => {
    const req = new NextRequest('http://localhost/recipes/import/instagram?sourceUrl=test')

    const res = middleware(req)

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe(
      'http://localhost/login?next=%2Frecipes%2Fimport%2Finstagram%3FsourceUrl%3Dtest'
    )
  })

  it('allows share-target path through without a session cookie', () => {
    const req = new NextRequest('http://localhost/share-target', { method: 'POST' })

    const res = middleware(req)

    expect(res.status).toBe(200)
  })
})
