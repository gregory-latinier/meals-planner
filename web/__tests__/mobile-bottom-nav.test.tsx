/** @jest-environment jsdom */

import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import MobileBottomNav from '@/components/MobileBottomNav'
import { I18nProvider } from '@/i18n/I18nContext'

const pushMock = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}))

describe('MobileBottomNav', () => {
  beforeEach(() => {
    pushMock.mockReset()
  })

  it('shows the active tab based on value', () => {
    render(
      <I18nProvider>
        <MobileBottomNav value="stores" />
      </I18nProvider>
    )

    expect(screen.getByRole('button', { name: 'Stores' }).className).toContain('Mui-selected')
  })

  it('navigates between tabs', () => {
    render(
      <I18nProvider>
        <MobileBottomNav value="recipes" />
      </I18nProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Stores' }))

    expect(pushMock).toHaveBeenCalledWith('/stores')
  })

  it('navigates to recipes tab', () => {
    render(
      <I18nProvider>
        <MobileBottomNav value="stores" />
      </I18nProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Recipes' }))

    expect(pushMock).toHaveBeenCalledWith('/recipes')
  })

  it('does not navigate when clicking already active tab', () => {
    render(
      <I18nProvider>
        <MobileBottomNav value="recipes" />
      </I18nProvider>
    )

    fireEvent.click(screen.getByRole('button', { name: 'Recipes' }))

    expect(pushMock).not.toHaveBeenCalled()
  })

  it('allows no selected tab state', () => {
    render(
      <I18nProvider>
        <MobileBottomNav value={null} />
      </I18nProvider>
    )

    expect(screen.getByRole('button', { name: 'Recipes' }).className).not.toContain('Mui-selected')
    expect(screen.getByRole('button', { name: 'Stores' }).className).not.toContain('Mui-selected')

    fireEvent.click(screen.getByRole('button', { name: 'Stores' }))

    expect(pushMock).toHaveBeenCalledWith('/stores')
  })
})
