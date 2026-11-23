type RecordKind = 'entry' | 'summary' | 'month-summary'
type JournalRecord = { kind: RecordKind; date: string; text: string }

function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null
}

const displayDate = (value: string) => value.replaceAll('-', '.')

// 仅导出当前用户日期有效且有实际内容的记录；保留正文原有 Markdown 格式。
export function buildJournalExport(storage: Storage, userId: string) {
  const records: JournalRecord[] = []
  const kinds: RecordKind[] = ['entry', 'summary', 'month-summary']
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index)
    if (!key) continue
    for (const kind of kinds) {
      const prefix = `journal:${kind}:${userId}:`
      if (!key.startsWith(prefix)) continue
      const date = key.slice(prefix.length)
      const validDate = kind === 'month-summary'
        ? /^\d{4}-\d{2}$/.test(date) && parseDate(`${date}-01`)
        : parseDate(date)
      const text = storage.getItem(key)
      if (validDate && text?.trim()) records.push({ kind, date, text })
    }
  }

  // 同日的周总结排在日记前；月总结始终排在本月最前面。
  const priority = { 'month-summary': 0, summary: 1, entry: 2 }
  records.sort((a, b) => a.date.localeCompare(b.date) || priority[a.kind] - priority[b.kind])
  const blocks: string[] = []
  let month = ''
  for (const record of records) {
    const recordMonth = record.date.slice(0, 7)
    if (month !== recordMonth) {
      month = recordMonth
      blocks.push(`## ${displayDate(month)}`)
    }
    if (record.kind === 'month-summary') {
      blocks.push(record.text)
    } else if (record.kind === 'summary') {
      // 存储键是周一，结束日期为同一周的周日，使用 UTC 避免夏令时偏移。
      const end = parseDate(record.date)!
      end.setUTCDate(end.getUTCDate() + 6)
      blocks.push(`${displayDate(record.date)}-${displayDate(end.toISOString().slice(0, 10))}`, record.text)
    } else {
      blocks.push(displayDate(record.date), record.text)
    }
  }

  return {
    markdown: blocks.length ? `${blocks.join('\n\n')}\n` : '',
    total: records.length,
    entries: records.filter(record => record.kind === 'entry').length,
    summaries: records.filter(record => record.kind === 'summary').length,
    monthSummaries: records.filter(record => record.kind === 'month-summary').length,
  }
}

export function downloadJournal(markdown: string, userName: string) {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  // 用户名仍用于显示，文件名替换操作系统不支持的字符。
  const safeName = Array.from(userName, char =>
    char.charCodeAt(0) < 32 || '<>:"/\\|?*'.includes(char) ? '_' : char,
  ).join('').trim() || 'journal'
  link.href = url
  link.download = `${safeName}-日记.md`
  try {
    document.body.appendChild(link)
    link.click()
  } finally {
    link.remove()
    // 给浏览器留出开始下载的时间，再释放临时 URL。
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
