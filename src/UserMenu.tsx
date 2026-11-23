import { useEffect, useRef, useState } from "react";
import { countUserRecords, deleteUser, saveUser, switchUser } from "./users";
import type { Profiles } from "./users";
import { buildJournalExport, downloadJournal } from "./exportJournal";

type Props = { profiles: Profiles; onChange: (profiles: Profiles) => void };

export function UserMenu({ profiles, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"edit" | "add" | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const currentUser = profiles.users.find(
    (user) => user.id === profiles.activeUserId,
  )!;

  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  function finish(next: Profiles) {
    onChange(next);
    setOpen(false);
    trigger.current?.focus();
  }

  function reportError(error: unknown) {
    setError(error instanceof Error ? error.message : "无法保存用户，请重试。");
  }

  function removeCurrentUser() {
    try {
      const { entries, summaries, monthSummaries } = countUserRecords(
        localStorage,
        currentUser.id,
      );
      const records =
        entries + summaries + monthSummaries > 0
          ? `该用户有 ${entries} 条日记、${summaries} 条周总结、${monthSummaries} 条月总结，将一并删除且无法恢复。\n`
          : "";
      const lastUser =
        profiles.users.length === 1 ? "\n删除后会创建一个空白用户 user0。" : "";
      if (
        !window.confirm(
          `${records}确定删除用户“${currentUser.name}”吗？${lastUser}`,
        )
      )
        return;
      finish(deleteUser(localStorage, currentUser.id));
    } catch (error) {
      reportError(error);
    }
  }

  function exportCurrentUser() {
    setError("");
    try {
      const result = buildJournalExport(localStorage, currentUser.id);
      if (result.total === 0) {
        window.alert(`用户“${currentUser.name}”暂无有效记录可导出。`);
        return;
      }
      if (
        !window.confirm(
          `将导出用户“${currentUser.name}”的全部 ${result.total} 条有效记录：\n${result.entries} 条日记、${result.summaries} 条周总结、${result.monthSummaries} 条月总结。\n\n确定导出为 Markdown 文件吗？`,
        )
      )
        return;
      downloadJournal(result.markdown, currentUser.name);
      setOpen(false);
      trigger.current?.focus();
    } catch {
      setError("导出失败，请重试。");
    }
  }

  return (
    <div className="flex justify-end absolute top-[1vw] right-[2.2vw]">
      <div ref={container} className="relative text-[14px] text-[#808080]">
        <button
          ref={trigger}
          type="button"
          aria-expanded={open}
          aria-controls="user-panel"
          aria-label={`当前用户：${currentUser.name}，打开用户菜单`}
          onClick={() => {
            setOpen(!open);
            setMode(null);
            setError("");
          }}
          className="max-w-60 cursor-pointer truncate px-3 py-2 hover:bg-black/5"
        >
          {currentUser.name}
        </button>
        {open && (
          <div
            id="user-panel"
            className="absolute right-0 z-10 w-64 border border-[#aaa] bg-[#f8f7f5] p-2"
          >
            {mode ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  try {
                    finish(
                      saveUser(
                        localStorage,
                        name,
                        mode === "edit" ? currentUser.id : undefined,
                      ),
                    );
                  } catch (error) {
                    reportError(error);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.stopPropagation();
                    setMode(null);
                    setError("");
                  }
                }}
              >
                <label htmlFor="user-name" className="block px-2 py-2">
                  {mode === "edit" ? "编辑用户名" : "新增用户"}
                </label>
                <input
                  id="user-name"
                  autoFocus
                  value={name}
                  maxLength={40}
                  required
                  autoComplete="off"
                  onChange={(event) => setName(event.target.value)}
                  className="w-full border-b border-[#aaa] bg-transparent px-2 py-2 text-[#111]"
                />
                <div className="mt-2 flex justify-end">
                  {mode === "edit" && (
                    <button
                      type="button"
                      onClick={removeCurrentUser}
                      className="mr-auto cursor-pointer px-3 py-2 text-[#a83d27] hover:bg-black/5"
                    >
                      删除用户
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setMode(null);
                      setError("");
                    }}
                    className="cursor-pointer px-3 py-2 hover:bg-black/5"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="cursor-pointer px-3 py-2 hover:bg-black/5"
                  >
                    保存
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div aria-label="切换用户" className="max-h-60 overflow-y-auto">
                  {profiles.users.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      aria-pressed={user.id === currentUser.id}
                      onClick={() => {
                        try {
                          finish(switchUser(localStorage, user.id));
                        } catch (error) {
                          reportError(error);
                        }
                      }}
                      className="flex w-full cursor-pointer items-center justify-between gap-2 px-2 py-2 text-left hover:bg-black/5"
                    >
                      <span className="truncate">{user.name}</span>
                      {user.id === currentUser.id && (
                        <span aria-hidden="true">✓</span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="mt-2 border-t border-[#aaa] pt-2">
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => {
                        setMode("edit");
                        setName(currentUser.name);
                        setError("");
                      }}
                      className="flex-1 cursor-pointer px-2 py-2 text-left hover:bg-black/5"
                    >
                      编辑用户
                    </button>
                    <button
                      type="button"
                      aria-label="导出记录"
                      title="导出记录"
                      onClick={exportCurrentUser}
                      className="flex size-10 shrink-0 cursor-pointer items-center justify-center hover:bg-black/5"
                    >
                      <svg
                        aria-hidden="true"
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 3v12m-4-4 4 4 4-4M5 15v5h14v-5" />
                      </svg>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("add");
                      setName("");
                      setError("");
                    }}
                    className="w-full cursor-pointer px-2 py-2 text-left hover:bg-black/5"
                  >
                    新增用户
                  </button>
                </div>
              </>
            )}
            {error && (
              <p role="alert" className="px-2 py-2 text-[#a83d27]">
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
