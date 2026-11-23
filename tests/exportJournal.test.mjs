import assert from 'node:assert/strict'
import test from 'node:test'
import { buildJournalExport } from '../src/exportJournal.ts'

function storage(values) {
  const keys = Object.keys(values)
  return { length: keys.length, key: index => keys[index] ?? null, getItem: key => values[key] ?? null }
}

test('按月份、周、日期排列，并保留正文格式', () => {
  const result = buildJournalExport(storage({
    'journal:entry:alice:2026-02-18': '今天的总结\n\n- 保留列表',
    'journal:entry:alice:2026-02-10': '这一天的内容',
    'journal:summary:alice:2026-02-16': '这周的总结',
    'journal:month-summary:alice:2026-02': '一段月总结',
    'journal:entry:alice:2026-02-16': '周一的内容',
  }), 'alice')
  assert.deepEqual(result, {
    markdown: '## 2026.02\n\n一段月总结\n\n2026.02.10\n\n这一天的内容\n\n2026.02.16-2026.02.22\n\n这周的总结\n\n2026.02.16\n\n周一的内容\n\n2026.02.18\n\n今天的总结\n\n- 保留列表\n',
    total: 5, entries: 3, summaries: 1, monthSummaries: 1,
  })
})

test('排除其他用户、空白和无效日期，不丢失闰日', () => {
  const result = buildJournalExport(storage({
    'journal:entry:bob:2026-02-10': '其他用户',
    'journal:entry:alice2:2026-02-10': '相近 ID',
    'journal:entry:alice:2026-02-11': ' \n\t',
    'journal:summary:alice:2026-02-09': '',
    'journal:month-summary:alice:2026-02': '　',
    'journal:entry:alice:2026-02-30': '无效日期',
    'journal:month-summary:alice:2026-13': '无效月份',
    'journal:entry:alice:2026-2-1': '格式错误',
    'journal:entry:alice:2024-02-29': '闰日',
    'journal:entry:alice:2026-02-29': '非闰年',
  }), 'alice')
  assert.equal(result.total, 1)
  assert.equal(result.markdown, '## 2024.02\n\n2024.02.29\n\n闰日\n')
})

test('跨年周总结仅出现一次，无日记的月总结和周总结仍导出', () => {
  const result = buildJournalExport(storage({
    'journal:entry:alice:2027-01-01': '新年',
    'journal:month-summary:alice:2027-02': '只有月总结',
    'journal:summary:alice:2026-12-28': '跨年周总结',
    'journal:summary:alice:2027-03-29': '只有周总结',
  }), 'alice')
  assert.equal(result.total, 4)
  assert.equal(result.markdown, '## 2026.12\n\n2026.12.28-2027.01.03\n\n跨年周总结\n\n## 2027.01\n\n2027.01.01\n\n新年\n\n## 2027.02\n\n只有月总结\n\n## 2027.03\n\n2027.03.29-2027.04.04\n\n只有周总结\n')
})

test('无有效记录时返回零条和空内容', () => {
  assert.deepEqual(buildJournalExport(storage({}), 'alice'), {
    markdown: '', total: 0, entries: 0, summaries: 0, monthSummaries: 0,
  })
})
