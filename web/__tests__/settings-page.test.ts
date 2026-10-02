import SettingsPage from '@/app/settings/page'
import SettingsClient from '@/app/settings/SettingsClient'
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

describe('SettingsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('redirects to /login when no session exists', async () => {
    mockedGetSession.mockResolvedValueOnce(null)

    await expect(SettingsPage()).rejects.toThrow('REDIRECT:/login')
    expect(mockedRedirect).toHaveBeenCalledWith('/login')
  })

  it('renders settings page for authenticated users', async () => {
    mockedGetSession.mockResolvedValueOnce({ id: 's1' } as Awaited<ReturnType<typeof getSession>>)

    const result = await SettingsPage()

    expect(mockedRedirect).not.toHaveBeenCalled()
    expect(result.type).toBe(SettingsClient)
  })
})
