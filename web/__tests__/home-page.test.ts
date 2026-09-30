import HomePage from '@/app/page'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'

jest.mock('@/lib/session', () => ({
  getSession: jest.fn(),
}))

jest.mock('next/navigation', () => ({
  redirect: jest.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`)
  }),
}))

const mockedGetSession = getSession as jest.MockedFunction<typeof getSession>
const mockedRedirect = redirect as jest.MockedFunction<typeof redirect>

describe('HomePage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('redirects to /login when no session exists', async () => {
    mockedGetSession.mockResolvedValueOnce(null)

    await expect(HomePage()).rejects.toThrow('REDIRECT:/login')
    expect(mockedRedirect).toHaveBeenCalledWith('/login')
  })

  it('redirects authenticated users to /cookbooks', async () => {
    mockedGetSession.mockResolvedValueOnce({ id: 's1' } as Awaited<ReturnType<typeof getSession>>)

    await expect(HomePage()).rejects.toThrow('REDIRECT:/cookbooks')
    expect(mockedRedirect).toHaveBeenCalledWith('/cookbooks')
  })
})
