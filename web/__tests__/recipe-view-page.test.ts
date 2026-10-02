import RecipeViewPage from '@/app/recipes/[recipeId]/page'
import RecipeViewClient from '@/app/recipes/[recipeId]/RecipeViewClient'
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

describe('RecipeViewPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('redirects to /login when no session exists', async () => {
    mockedGetSession.mockResolvedValueOnce(null)

    await expect(
      RecipeViewPage({ params: Promise.resolve({ recipeId: 'c123456789012345678901234' }) })
    ).rejects.toThrow('REDIRECT:/login')

    expect(mockedRedirect).toHaveBeenCalledWith('/login')
  })

  it('renders view client for authenticated users', async () => {
    mockedGetSession.mockResolvedValueOnce({ id: 's1' } as Awaited<ReturnType<typeof getSession>>)

    const result = await RecipeViewPage({
      params: Promise.resolve({ recipeId: 'c123456789012345678901234' }),
    })

    expect(mockedRedirect).not.toHaveBeenCalled()
    expect(result.type).toBe(RecipeViewClient)
    expect(result.props.recipeId).toBe('c123456789012345678901234')
  })
})
