export function getMonth(year: number, month: number) {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7
  const days = new Date(year, month + 1, 0).getDate()

  return { offset, days, weekCount: Math.ceil((offset + days) / 7) }
}

export function getWeekIndex(date: Date) {
  const { offset } = getMonth(date.getFullYear(), date.getMonth())
  return Math.floor((offset + date.getDate() - 1) / 7)
}

export function getWeekDates(year: number, month: number, week: number) {
  const { offset } = getMonth(year, month)
  return Array.from({ length: 7 }, (_, day) => new Date(year, month, 1 - offset + week * 7 + day))
}

// 每次移动完整一周；目标周仍包含本月日期时保留当前月历。
export function shiftWeek(year: number, month: number, week: number, direction: number) {
  const dates = getWeekDates(year, month, week + direction)
  const anchor = dates.find(date => date.getFullYear() === year && date.getMonth() === month)
    ?? dates[direction > 0 ? 0 : 6]

  return {
    year: anchor.getFullYear(),
    month: anchor.getMonth(),
    week: getWeekIndex(anchor),
  }
}

export function pad(day: number) {
  return String(day).padStart(2, '0')
}

export function formatDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function parseDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null
}
