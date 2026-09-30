import StoresPage from '@/app/stores/page'
import StoresClient from '@/app/stores/StoresClient'
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

describe('StoresPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('redirects to /login when no session exists', async () => {
    mockedGetSession.mockResolvedValueOnce(null)

    await expect(StoresPage()).rejects.toThrow('REDIRECT:/login')
    expect(mockedRedirect).toHaveBeenCalledWith('/login')
  })

  it('renders the stores page for authenticated users', async () => {
    mockedGetSession.mockResolvedValueOnce({ id: 's1' } as Awaited<ReturnType<typeof getSession>>)

    const result = await StoresPage()

    expect(mockedRedirect).not.toHaveBeenCalled()
    expect(result.type).toBe(StoresClient)
  })
})
