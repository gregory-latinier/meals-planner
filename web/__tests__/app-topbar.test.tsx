/** @jest-environment jsdom */

import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import AppTopBar from '@/components/AppTopBar'
import { I18nProvider } from '@/i18n/I18nContext'

const pushMock = jest.fn()
const refreshMock = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
    refresh: refreshMock,
  }),
}))

jest.mock('@/hooks/useRealtime', () => ({
  useRealtime: () => ({
    connected: true,
  }),
}))

describe('AppTopBar', () => {
  beforeEach(() => {
    pushMock.mockReset()
    refreshMock.mockReset()
    global.fetch = jest.fn().mockResolvedValue({ ok: true } as Response) as unknown as typeof fetch
  })

  it('navigates to /settings from settings icon', () => {
    render(
      <I18nProvider>
        <AppTopBar />
      </I18nProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))

    expect(pushMock).toHaveBeenCalledWith('/settings')
  })
})
