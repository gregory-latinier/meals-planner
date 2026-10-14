export function formatLocalDate(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
  date.setDate(diff)
  date.setHours(0, 0, 0, 0)
  return date
}

export function getNextWeekMonday(fromDate: Date = new Date()): string {
  const currentMonday = getMonday(fromDate)
  const nextMonday = new Date(currentMonday)
  nextMonday.setDate(currentMonday.getDate() + 7)
  return formatLocalDate(nextMonday)
}
