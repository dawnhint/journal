import { useState } from 'react'

// 日记、周总结和月总结共用保存逻辑，切换记录时由 key 重置状态。
export function Note({ storageKey, label, ruled = false }: {
  storageKey: string
  label: string
  ruled?: boolean
}) {
  const [note, setNote] = useState(() => {
    try {
      return { text: localStorage.getItem(storageKey) ?? '', error: '' }
    } catch {
      return { text: '', error: '无法读取浏览器本地记录。' }
    }
  })

  function save(text: string) {
    try {
      if (text === '') {
        localStorage.removeItem(storageKey)
      } else {
        localStorage.setItem(storageKey, text)
      }
      setNote({ text, error: '' })
    } catch {
      setNote({ text, error: '未能保存到浏览器本地，请先复制保留内容。' })
    }
  }

  return (
    <div className={`flex min-h-0 min-w-0 flex-1 flex-col ${ruled ? '[container-type:size]' : ''}`}>
      <textarea
        aria-label={label}
        data-empty={ruled ? note.text.trim() === '' && !note.error : undefined}
        rows={ruled ? 7 : undefined}
        value={note.text}
        onChange={(event) => save(event.target.value)}
        className={`min-h-0 w-full resize-none border-0 bg-transparent p-0 text-[#111] outline-none ${ruled ? 'journal-ruled text-[15px]' : 'flex-1'}`}
      />
      {note.error && <p role="alert">{note.error}</p>}
    </div>
  )
}
