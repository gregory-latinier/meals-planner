import { getIsoMonday, getIsoWeekStart } from './meal-plans'

describe('meal-plans date helpers', () => {
  describe('getIsoMonday', () => {
    it('returns the same date when given date is Monday', () => {
      // 2026-10-12 is Monday
      expect(getIsoMonday('2026-10-12')).toBe('2026-10-12')
    })

    it('returns Monday when given date is Tuesday', () => {
      // 2026-10-13 is Tuesday -> Monday is 2026-10-12
      expect(getIsoMonday('2026-10-13')).toBe('2026-10-12')
    })

    it('returns Monday when given date is Wednesday', () => {
      // 2026-10-14 is Wednesday -> Monday is 2026-10-12
      expect(getIsoMonday('2026-10-14')).toBe('2026-10-12')
    })

    it('returns Monday when given date is Sunday', () => {
      // 2026-10-18 is Sunday -> Monday is 2026-10-12
      expect(getIsoMonday('2026-10-18')).toBe('2026-10-12')
    })

    it('returns Monday when given date is Saturday', () => {
      // 2026-10-17 is Saturday -> Monday is 2026-10-12
      expect(getIsoMonday('2026-10-17')).toBe('2026-10-12')
    })

    it('handles month boundaries correctly', () => {
      // 2026-11-01 is Sunday -> Monday is 2026-10-26
      expect(getIsoMonday('2026-11-01')).toBe('2026-10-26')
    })

    it('handles year boundaries correctly', () => {
      // 2026-01-01 is Thursday -> Monday is 2025-12-29
      expect(getIsoMonday('2026-01-01')).toBe('2025-12-29')
    })
  })

  describe('getIsoWeekStart for Saturday (weekStartDay = 6)', () => {
    it('returns the same date when given date is Saturday', () => {
      // 2026-10-17 is Saturday
      expect(getIsoWeekStart('2026-10-17', 6)).toBe('2026-10-17')
    })

    it('returns Saturday for Sunday in same planning week', () => {
      // 2026-10-18 is Sunday -> Saturday is 2026-10-17
      expect(getIsoWeekStart('2026-10-18', 6)).toBe('2026-10-17')
    })

    it('returns Saturday for Tuesday in same planning week', () => {
      // 2026-10-20 is Tuesday -> Saturday is 2026-10-17
      expect(getIsoWeekStart('2026-10-20', 6)).toBe('2026-10-17')
    })

    it('returns Saturday for Friday at end of planning week', () => {
      // 2026-10-23 is Friday -> Saturday is 2026-10-17
      expect(getIsoWeekStart('2026-10-23', 6)).toBe('2026-10-17')
    })

    it('moves to next Saturday on next day', () => {
      // 2026-10-24 is Saturday -> Saturday is 2026-10-24
      expect(getIsoWeekStart('2026-10-24', 6)).toBe('2026-10-24')
    })
  })
})
