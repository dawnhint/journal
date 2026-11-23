// 用户：固定 ID 关联日记、周总结和月总结，显示名称可修改。
export type User = { id: string; name: string }
// 用户列表及当前选中的用户。
export type Profiles = { users: User[]; activeUserId: string }

const USERS_KEY = 'journal:users' // 用户列表的存储键
const ACTIVE_KEY = 'journal:active-user' // 当前用户的存储键
const DEFAULT_ID = 'default' // 首次创建的默认用户 ID

// 生成按用户、日期隔离的日记存储键。
export function entryKey(userId: string, dateKey: string) {
  return `journal:entry:${userId}:${dateKey}`
}

// 以本周周一的本地日期标识周总结，跨月、跨年共用同一条记录。
export function summaryKey(userId: string, weekStart: string) {
  return `journal:summary:${userId}:${weekStart}`
}

// 以年月标识月总结，同一个月内切换周时共用一条记录。
export function monthSummaryKey(userId: string, month: string) {
  return `journal:month-summary:${userId}:${month}`
}

// 读取用户资料；首次使用时创建 user0，并迁移旧日记。
export function loadProfiles(storage: Storage): Profiles {
  const saved = storage.getItem(USERS_KEY)
  const users: User[] = saved === null
    ? [{ id: DEFAULT_ID, name: 'user0' }]
    : JSON.parse(saved)

  if (!Array.isArray(users) || users.length === 0 || users.some(user =>
    !user || typeof user.id !== 'string' || !user.id ||
    typeof user.name !== 'string' || !user.name.trim(),
  ) || new Set(users.map(user => user.id)).size !== users.length) {
    throw new Error('用户数据无法读取，原有记录已保留。')
  }

  // 更新旧版默认名称，保留自定义名称并避免重名。
  const defaultUser = users.find(user => user.id === DEFAULT_ID)
  const renameDefault = defaultUser?.name === '默认用户'
    && !users.some(user => user.id !== DEFAULT_ID && user.name === 'user0')
  if (renameDefault) defaultUser.name = 'user0'
  if (saved === null || renameDefault) storage.setItem(USERS_KEY, JSON.stringify(users))

  // 先收集旧键名，避免删除时跳项；迁移中断后可重试。
  const legacyKeys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
    .filter((key): key is string => key !== null && /^journal:entry:\d{4}-\d{2}-\d{2}$/.test(key))

  if (legacyKeys.length && !users.some(user => user.id === DEFAULT_ID)) {
    throw new Error('未找到默认用户，旧日记已保留。')
  }

  for (const key of legacyKeys) {
    const text = storage.getItem(key)
    if (text === null) continue
    const destination = entryKey(DEFAULT_ID, key.slice('journal:entry:'.length))
    const existing = storage.getItem(destination)
    if (existing !== null && existing !== text) {
      throw new Error('旧日记与默认用户记录存在冲突，两份内容均已保留。')
    }
    // 确认新记录写入成功后，再删除旧记录。
    storage.setItem(destination, text)
    if (storage.getItem(destination) !== text) throw new Error('旧日记迁移未完成，请重试。')
    storage.removeItem(key)
  }

  // 恢复上次选择；用户不存在时使用列表中的第一位。
  const savedActive = storage.getItem(ACTIVE_KEY)
  const activeUserId = users.find(user => user.id === savedActive)?.id ?? users[0].id
  if (savedActive !== activeUserId) storage.setItem(ACTIVE_KEY, activeUserId)
  return { users, activeUserId }
}

// 切换用户，并保存选择。
export function switchUser(storage: Storage, id: string): Profiles {
  const profiles = loadProfiles(storage)
  if (!profiles.users.some(user => user.id === id)) throw new Error('用户不存在。')
  storage.setItem(ACTIVE_KEY, id)
  return { ...profiles, activeUserId: id }
}

// 传入 ID 时修改用户名；未传入时新增用户并切换。
export function saveUser(storage: Storage, name: string, userId?: string): Profiles {
  const profiles = loadProfiles(storage)
  const trimmedName = name.trim()
  if (!trimmedName || trimmedName.length > 40) throw new Error('请输入 1–40 个字符的用户名。')
  if (profiles.users.some(user => user.id !== userId && user.name === trimmedName)) {
    throw new Error('该用户名已存在。')
  }
  if (userId && !profiles.users.some(user => user.id === userId)) throw new Error('用户不存在。')

  const id = userId ?? crypto.randomUUID()
  const users = userId
    ? profiles.users.map(user => user.id === id ? { ...user, name: trimmedName } : user)
    : [...profiles.users, { id, name: trimmedName }]
  storage.setItem(USERS_KEY, JSON.stringify(users))
  if (!userId) storage.setItem(ACTIVE_KEY, id)
  return { users, activeUserId: userId ? profiles.activeUserId : id }
}

// 按类型收集指定用户的记录存储键。
type RecordKind = 'entry' | 'summary' | 'month-summary'

function userRecordKeys(storage: Storage, userId: string, kind: RecordKind) {
  const prefix = `journal:${kind}:${userId}:`
  return Array.from({ length: storage.length }, (_, index) => storage.key(index))
    .filter((key): key is string => key !== null && key.startsWith(prefix))
}

// 分别统计非空日记、周总结和月总结，供删除确认弹窗使用。
export function countUserRecords(storage: Storage, userId: string) {
  const count = (kind: RecordKind) =>
    userRecordKeys(storage, userId, kind).filter(key => Boolean(storage.getItem(key))).length
  return { entries: count('entry'), summaries: count('summary'), monthSummaries: count('month-summary') }
}

// 删除用户及其日记、周总结和月总结；删除最后一位时创建空白 user0。
export function deleteUser(storage: Storage, userId: string): Profiles {
  const profiles = loadProfiles(storage)
  if (!profiles.users.some(user => user.id === userId)) throw new Error('用户不存在。')
  const remaining = profiles.users.filter(user => user.id !== userId)
  const users = remaining.length ? remaining : [{ id: crypto.randomUUID(), name: 'user0' }]
  const activeUserId = profiles.activeUserId === userId ? users[0].id : profiles.activeUserId
  const recordKeys = [
    ...userRecordKeys(storage, userId, 'entry'),
    ...userRecordKeys(storage, userId, 'summary'),
    ...userRecordKeys(storage, userId, 'month-summary'),
  ]
  const keys = [...recordKeys, USERS_KEY, ACTIVE_KEY]
  // 临时备份待修改的数据，删除异常时尝试恢复。
  const backup = keys.map(key => [key, storage.getItem(key)] as const)

  try {
    storage.setItem(USERS_KEY, JSON.stringify(users))
    storage.setItem(ACTIVE_KEY, activeUserId)
    for (const key of recordKeys) storage.removeItem(key)
  } catch (error) {
    try {
      for (const [key, value] of backup) {
        if (storage.getItem(key) === value) continue
        if (value === null) storage.removeItem(key)
        else storage.setItem(key, value)
      }
    } catch {
      throw new Error('删除未完成，本地存储异常，请刷新后检查用户和记录。')
    }
    throw error
  }
  return { users, activeUserId }
}
