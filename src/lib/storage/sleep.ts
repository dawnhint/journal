import { sleepMonthKey } from './keys.ts'

export type SleepPeriod = {
  day: number
  startHour: number
  endHour: number
  color: string
}

export type SleepMonthData = {
  periods: SleepPeriod[]
  energy: Record<string, number>
  notes: Record<string, string>
}

export function emptySleepMonth(): SleepMonthData {
  return { periods: [], energy: {}, notes: {} }
}

function isPeriod(value: unknown): value is SleepPeriod {
  if (!value || typeof value !== 'object') return false
  const item = value as SleepPeriod
  return (
    Number.isInteger(item.day) &&
    Number.isInteger(item.startHour) &&
    Number.isInteger(item.endHour) &&
    typeof item.color === 'string'
  )
}

function parseSleepMonth(raw: string | null): SleepMonthData {
  if (raw === null || raw === '') return emptySleepMonth()
  const parsed: unknown = JSON.parse(raw)
  if (!parsed || typeof parsed !== 'object') return emptySleepMonth()
  const body = parsed as Partial<SleepMonthData>
  const periods = Array.isArray(body.periods)
    ? body.periods.filter(isPeriod)
    : []
  const energy =
    body.energy && typeof body.energy === 'object' ? { ...body.energy } : {}
  const notes =
    body.notes && typeof body.notes === 'object' ? { ...body.notes } : {}
  return { periods, energy, notes }
}

export function loadSleepMonth(
  storage: Storage,
  userId: string,
  yearMonth: string,
): { data: SleepMonthData; error: string } {
  try {
    return {
      data: parseSleepMonth(storage.getItem(sleepMonthKey(userId, yearMonth))),
      error: '',
    }
  } catch {
    return {
      data: emptySleepMonth(),
      error: '无法读取本地睡眠记录，请重试。',
    }
  }
}

export function saveSleepMonth(
  storage: Storage,
  userId: string,
  yearMonth: string,
  data: SleepMonthData,
): string {
  try {
    const key = sleepMonthKey(userId, yearMonth)
    const hasContent =
      data.periods.length > 0 ||
      Object.keys(data.energy).length > 0 ||
      Object.keys(data.notes).some((day) => data.notes[day]?.trim())
    if (!hasContent) {
      storage.removeItem(key)
      return ''
    }
    storage.setItem(key, JSON.stringify(data))
    return ''
  } catch {
    return '未能保存到浏览器本地，请先复制保留内容。'
  }
}
