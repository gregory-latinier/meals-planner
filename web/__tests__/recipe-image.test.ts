import { downloadImageBuffer } from '@/lib/recipe-image'

describe('recipe image download', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('downloads image from safe remote URL', async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: {
          'content-type': 'image/png',
          'content-length': '3',
        },
      })
    )
    global.fetch = fetchMock as unknown as typeof fetch

    const buffer = await downloadImageBuffer('https://93.184.216.34/photo.png')

    expect(buffer).toEqual(Buffer.from([1, 2, 3]))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      'https://93.184.216.34/photo.png',
      expect.objectContaining({ method: 'GET', redirect: 'manual' })
    )
  })

  it('follows redirects and re-validates each hop', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 302,
          headers: {
            location: 'https://93.184.216.35/new-photo.jpg',
          },
        })
      )
      .mockResolvedValueOnce(
        new Response(new Uint8Array([9, 8, 7]), {
          status: 200,
          headers: {
            'content-type': 'image/jpeg',
          },
        })
      )
    global.fetch = fetchMock as unknown as typeof fetch

    const buffer = await downloadImageBuffer('https://93.184.216.34/redirect.jpg')

    expect(buffer).toEqual(Buffer.from([9, 8, 7]))
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://93.184.216.34/redirect.jpg',
      expect.objectContaining({ method: 'GET', redirect: 'manual' })
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://93.184.216.35/new-photo.jpg',
      expect.objectContaining({ method: 'GET', redirect: 'manual' })
    )
  })

  it('rejects localhost/private image URLs before fetching', async () => {
    const fetchMock = jest.fn()
    global.fetch = fetchMock as unknown as typeof fetch

    await expect(downloadImageBuffer('http://127.0.0.1/private.jpg')).rejects.toThrow('Image URL is not allowed.')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects redirects to localhost/private hosts', async () => {
    const fetchMock = jest.fn().mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: {
          location: 'http://127.0.0.1/private.jpg',
        },
      })
    )
    global.fetch = fetchMock as unknown as typeof fetch

    await expect(downloadImageBuffer('https://93.184.216.34/redirect.jpg')).rejects.toThrow('Image URL is not allowed.')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
