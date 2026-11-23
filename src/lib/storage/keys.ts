export type RecordKind = 'entry' | 'summary' | 'month-summary'

export const RECORD_KINDS: RecordKind[] = ['entry', 'summary', 'month-summary']

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

export function isLegacyEntryKey(key: string) {
  return /^journal:entry:\d{4}-\d{2}-\d{2}$/.test(key)
}
