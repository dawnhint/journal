import { entryKey, isLegacyEntryKey, RECORD_KINDS, recordPrefix } from './keys.ts'
import type { RecordKind } from './keys.ts'

export function userRecordKeys(storage: Storage, userId: string, kind: RecordKind) {
  const prefix = recordPrefix(kind, userId)
  return Array.from({ length: storage.length }, (_, index) => storage.key(index))
    .filter((key): key is string => key !== null && key.startsWith(prefix))
}

export function countUserRecords(storage: Storage, userId: string) {
  const count = (kind: RecordKind) =>
    userRecordKeys(storage, userId, kind).filter(key => Boolean(storage.getItem(key))).length
  return {
    entries: count('entry'),
    summaries: count('summary'),
    monthSummaries: count('month-summary'),
    monthDays: count('month-day'),
    monthWeeks: count('month-week'),
  }
}

export function migrateLegacyEntries(storage: Storage, defaultUserId: string) {
  const legacyKeys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
    .filter((key): key is string => key !== null && isLegacyEntryKey(key))

  if (legacyKeys.length === 0) return
  if (!defaultUserId) throw new Error('未找到默认用户，旧日记已保留。')

  for (const key of legacyKeys) {
    const text = storage.getItem(key)
    if (text === null) continue
    const destination = entryKey(defaultUserId, key.slice('journal:entry:'.length))
    const existing = storage.getItem(destination)
    if (existing !== null && existing !== text) {
      throw new Error('旧日记与默认用户记录存在冲突，两份内容均已保留。')
    }
    storage.setItem(destination, text)
    if (storage.getItem(destination) !== text) throw new Error('旧日记迁移未完成，请重试。')
    storage.removeItem(key)
  }
}

export function allUserRecordKeys(storage: Storage, userId: string) {
  return RECORD_KINDS.flatMap(kind => userRecordKeys(storage, userId, kind))
}
