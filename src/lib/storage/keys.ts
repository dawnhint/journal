export type RecordKind =
  | 'entry'
  | 'summary'
  | 'month-summary'
  | 'month-day'
  | 'month-week'

export const RECORD_KINDS: RecordKind[] = [
  'entry',
  'summary',
  'month-summary',
  'month-day',
  'month-week',
]

export function recordPrefix(kind: RecordKind, userId: string) {
  return `journal:${kind}:${userId}:`
}

export function entryKey(userId: string, dateKey: string) {
  return `${recordPrefix('entry', userId)}${dateKey}`
}

export function summaryKey(userId: string, weekStart: string) {
  return `${recordPrefix('summary', userId)}${weekStart}`
}

export function monthSummaryKey(userId: string, month: string) {
  return `${recordPrefix('month-summary', userId)}${month}`
}

/** 月历视图中的单日笔记（与周视图 entry 独立）。 */
export function monthDayKey(userId: string, dateKey: string) {
  return `${recordPrefix('month-day', userId)}${dateKey}`
}

/** 月历视图中的周总结列（与周视图 summary 独立）。 */
export function monthWeekKey(
  userId: string,
  year: number,
  month: number,
  week: number,
) {
  const stamp = `${year}-${String(month + 1).padStart(2, '0')}-w${week}`
  return `${recordPrefix('month-week', userId)}${stamp}`
}

export function isLegacyEntryKey(key: string) {
  return /^journal:entry:\d{4}-\d{2}-\d{2}$/.test(key)
}
