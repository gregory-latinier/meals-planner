// Unit tests for auth utility functions
// These are pure logic tests with no DB or network I/O

import { checkRateLimit, clearRateLimit, generateSecureToken, getClientIp } from '@/lib/auth'

describe('generateSecureToken', () => {
  it('returns a 64-character hex string', () => {
    const token = generateSecureToken()
    expect(token).toHaveLength(64)
    expect(token).toMatch(/^[a-f0-9]{64}$/)
  })

  it('returns a different token each call', () => {
    const a = generateSecureToken()
    const b = generateSecureToken()
    expect(a).not.toBe(b)
  })
})

describe('getClientIp', () => {
  it('extracts IP from x-forwarded-for header', () => {
    const req = new Request('http://localhost/', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    })
    expect(getClientIp(req)).toBe('1.2.3.4')
  })

  it('returns "unknown" when no forwarded header', () => {
    const req = new Request('http://localhost/')
    expect(getClientIp(req)).toBe('unknown')
  })
})

describe('checkRateLimit', () => {
  const testIp = `test-${Date.now()}`

  afterEach(() => {
    clearRateLimit(testIp)
  })

  it('allows the first request', () => {
    const result = checkRateLimit(testIp)
    expect(result.allowed).toBe(true)
  })

  it('blocks after MAX_ATTEMPTS', () => {
    for (let i = 0; i < 5; i++) checkRateLimit(testIp)
    const result = checkRateLimit(testIp)
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('clears the limit after clearRateLimit', () => {
    for (let i = 0; i < 5; i++) checkRateLimit(testIp)
    clearRateLimit(testIp)
    const result = checkRateLimit(testIp)
    expect(result.allowed).toBe(true)
  })
})
