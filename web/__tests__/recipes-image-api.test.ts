import { POST } from '@/app/api/recipes/image/route'
import { processAndStoreRecipeImage } from '@/lib/recipe-image'
import { getSession } from '@/lib/session'

jest.mock('@/lib/session', () => ({
  getSession: jest.fn(),
}))

jest.mock('@/lib/recipe-image', () => ({
  processAndStoreRecipeImage: jest.fn(),
}))

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedProcessAndStoreRecipeImage = processAndStoreRecipeImage as jest.MockedFunction<typeof processAndStoreRecipeImage>

describe('recipes image API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('POST /api/recipes/image returns 401 when unauthenticated', async () => {
    mockedGetSession.mockResolvedValueOnce(null)

    const req = new Request('http://localhost/api/recipes/image', {
      method: 'POST',
      body: new FormData(),
    })

    const res = await POST(req)

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: 'Unauthorized.' })
  })

  it('POST /api/recipes/image returns 400 when image is missing', async () => {
    mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)

    const req = new Request('http://localhost/api/recipes/image', {
      method: 'POST',
      body: new FormData(),
    })

    const res = await POST(req)

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Image file is required.' })
  })

  it('POST /api/recipes/image returns 400 when file is not an image', async () => {
    mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)

    const form = new FormData()
    form.append('image', new File([new Uint8Array([1, 2, 3])], 'notes.txt', { type: 'text/plain' }))

    const req = new Request('http://localhost/api/recipes/image', {
      method: 'POST',
      body: form,
    })

    const res = await POST(req)

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'File must be an image.' })
  })

  it('POST /api/recipes/image stores optimized JPEG and returns metadata', async () => {
    mockedGetSession.mockResolvedValueOnce({ householdId: 'house-1' } as Awaited<ReturnType<typeof getSession>>)

    mockedProcessAndStoreRecipeImage.mockResolvedValueOnce({
      path: '/uploads/recipes/img-123.jpg',
      mimeType: 'image/jpeg',
      width: 1200,
      height: 800,
      sizeBytes: 34567,
    })

    const form = new FormData()
    form.append('image', new File([new Uint8Array([1, 2, 3, 4])], 'photo.png', { type: 'image/png' }))

    const req = new Request('http://localhost/api/recipes/image', {
      method: 'POST',
      body: form,
    })

    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({
      image: {
        path: '/uploads/recipes/img-123.jpg',
        mimeType: 'image/jpeg',
        width: 1200,
        height: 800,
        sizeBytes: 34567,
      },
    })

    expect(mockedProcessAndStoreRecipeImage).toHaveBeenCalledTimes(1)
  })
})
