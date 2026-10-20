export function formatLocalDate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getWeekStart(d: Date, weekStartDay: number = 1): Date {
  const date = new Date(d)
  const day = date.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const diffDays = (day - weekStartDay + 7) % 7
  date.setDate(date.getDate() - diffDays)
  date.setHours(0, 0, 0, 0)
  return date
}

export function getMonday(d: Date): Date {
  return getWeekStart(d, 1)
}

export function getNextPlanningWeekStart(fromDate: Date = new Date(), weekStartDay: number = 1): string {
  const date = new Date(fromDate)
  date.setHours(0, 0, 0, 0)
  const day = date.getDay()
  const daysUntilNextStart = (weekStartDay - day + 7) % 7
  date.setDate(date.getDate() + daysUntilNextStart)
  return formatLocalDate(date)
}

export function getNextWeekMonday(fromDate: Date = new Date()): string {
  const currentMonday = getMonday(fromDate)
  const nextMonday = new Date(currentMonday)
  nextMonday.setDate(currentMonday.getDate() + 7)
  return formatLocalDate(nextMonday)
}
