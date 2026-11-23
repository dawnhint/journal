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
