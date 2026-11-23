import { allUserRecordKeys, migrateLegacyEntries } from './records.ts'

export type User = { id: string; name: string }
export type Profiles = { users: User[]; activeUserId: string }

const USERS_KEY = 'journal:users'
const ACTIVE_KEY = 'journal:active-user'
const DEFAULT_ID = 'default'

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

  const defaultUser = users.find(user => user.id === DEFAULT_ID)
  const renameDefault = defaultUser?.name === '默认用户'
    && !users.some(user => user.id !== DEFAULT_ID && user.name === 'user0')
  if (renameDefault) defaultUser.name = 'user0'
  if (saved === null || renameDefault) storage.setItem(USERS_KEY, JSON.stringify(users))

  const defaultUserId = users.some(user => user.id === DEFAULT_ID) ? DEFAULT_ID : ''
  migrateLegacyEntries(storage, defaultUserId)

  const savedActive = storage.getItem(ACTIVE_KEY)
  const activeUserId = users.find(user => user.id === savedActive)?.id ?? users[0].id
  if (savedActive !== activeUserId) storage.setItem(ACTIVE_KEY, activeUserId)
  return { users, activeUserId }
}

export function switchUser(storage: Storage, id: string): Profiles {
  const profiles = loadProfiles(storage)
  if (!profiles.users.some(user => user.id === id)) throw new Error('用户不存在。')
  storage.setItem(ACTIVE_KEY, id)
  return { ...profiles, activeUserId: id }
}

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

export function deleteUser(storage: Storage, userId: string): Profiles {
  const profiles = loadProfiles(storage)
  if (!profiles.users.some(user => user.id === userId)) throw new Error('用户不存在。')
  const remaining = profiles.users.filter(user => user.id !== userId)
  const users = remaining.length ? remaining : [{ id: crypto.randomUUID(), name: 'user0' }]
  const activeUserId = profiles.activeUserId === userId ? users[0].id : profiles.activeUserId
  const recordKeys = allUserRecordKeys(storage, userId)
  const keys = [...recordKeys, USERS_KEY, ACTIVE_KEY]
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
