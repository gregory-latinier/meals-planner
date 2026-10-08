/** @jest-environment jsdom */

import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import LoginPage from '@/app/(auth)/login/page'
import { I18nProvider } from '@/i18n/I18nContext'

const pushMock = jest.fn()
const refreshMock = jest.fn()
let nextParam: string | null = null

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
  useSearchParams: () => ({
    get: (key: string) => (key === 'next' ? nextParam : null),
  }),
}))

function renderLogin() {
  return render(
    <I18nProvider>
      <LoginPage />
    </I18nProvider>
  )
}

describe('LoginPage next redirect behavior', () => {
  beforeEach(() => {
    pushMock.mockReset()
    refreshMock.mockReset()
    nextParam = null
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as Response)
  })

  it('redirects to safe next path after successful login', async () => {
    nextParam = '/recipes/import/instagram?sourceUrl=https%3A%2F%2Fwww.instagram.com%2Freel%2Fabc%2F'

    renderLogin()

    fireEvent.change(screen.getByLabelText(/Household Password/i), { target: { value: 'secret-pass' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enter' }))

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/recipes/import/instagram?sourceUrl=https%3A%2F%2Fwww.instagram.com%2Freel%2Fabc%2F')
    })
    expect(refreshMock).toHaveBeenCalledTimes(1)
  })

  it('falls back to /recipes when next param is unsafe', async () => {
    nextParam = 'https://evil.example/phish'

    renderLogin()

    fireEvent.change(screen.getByLabelText(/Household Password/i), { target: { value: 'secret-pass' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enter' }))

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/recipes')
    })
    expect(refreshMock).toHaveBeenCalledTimes(1)
  })
})
