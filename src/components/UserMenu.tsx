import { useEffect, useRef, useState } from "react";
import { countUserRecords } from "../lib/storage/records.ts";
import { deleteUser, saveUser, switchUser } from "../lib/storage/profiles.ts";
import type { Profiles } from "../lib/storage/profiles.ts";
import { buildJournalExport, downloadJournal } from "../lib/exportJournal.ts";
import { HelpDoc } from "./HelpDoc.tsx";

type Props = { profiles: Profiles; onChange: (profiles: Profiles) => void };

export function UserMenu({ profiles, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [mode, setMode] = useState<"edit" | "add" | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const helpTrigger = useRef<HTMLButtonElement>(null);
  const currentUser = profiles.users.find(
    (user) => user.id === profiles.activeUserId,
  )!;

  useEffect(() => {
    if (!open && !helpOpen) return;
    function outside(event: PointerEvent) {
      if (!container.current?.contains(event.target as Node)) {
        setOpen(false);
        setHelpOpen(false);
      }
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (helpOpen) {
          setHelpOpen(false);
          helpTrigger.current?.focus();
          return;
        }
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
  }, [open, helpOpen]);

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
          `将导出用户“${currentUser.name}”的全部 ${result.total} 条有效记录：\n${result.entries} 条日记、${result.summaries} 条周总结、${result.monthSummaries} 条月总结。\n\n确定导出为文本文件吗？`,
        )
      )
        return;
      downloadJournal(result.text, currentUser.name);
      setOpen(false);
      trigger.current?.focus();
    } catch {
      setError("导出失败，请重试。");
    }
  }

  return (
    <div className="flex justify-end">
      <div
        ref={container}
        className="relative flex items-center text-[14px] text-[#808080]"
      >
        <div className="relative">
          <button
            ref={trigger}
            type="button"
            aria-expanded={open}
            aria-controls="user-panel"
            aria-label={`当前用户：${currentUser.name}，打开用户菜单`}
            onClick={() => {
              setOpen(!open);
              setHelpOpen(false);
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
              className="absolute right-0 z-10 w-64 border border-line bg-[#ffffff] p-2"
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
                    className="w-full border-b border-line bg-transparent px-2 py-2 text-ink"
                  />
                  <div className="mt-2 flex justify-end">
                    {mode === "edit" && (
                      <button
                        type="button"
                        onClick={removeCurrentUser}
                        className="mr-auto cursor-pointer px-3 py-2 text-p2 hover:bg-black/5"
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
                  <div
                    aria-label="切换用户"
                    className="max-h-60 overflow-y-auto"
                  >
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
                  <div className="mt-2 border-t border-line pt-2">
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
                      + 新增用户
                    </button>
                  </div>
                </>
              )}
              {error && (
                <p role="alert" className="px-2 py-2 text-p2">
                  {error}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="relative">
          <button
            ref={helpTrigger}
            type="button"
            aria-expanded={helpOpen}
            aria-controls="help-panel"
            aria-label="说明文档"
            onClick={() => {
              setHelpOpen(!helpOpen);
              setOpen(false);
              setMode(null);
              setError("");
            }}
            className="ml-2 flex size-7 cursor-pointer items-center justify-center hover:text-black"
          >
            <svg
              aria-hidden="true"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M9.5 9.5a2.5 2.5 0 1 1 3.8 2.1c-.8.5-1.3 1-1.3 2" />
              <circle
                cx="12"
                cy="16.5"
                r="0.75"
                fill="currentColor"
                stroke="none"
              />
            </svg>
          </button>
          {helpOpen && (
            <div
              id="help-panel"
              role="dialog"
              aria-label="说明文档"
              className="absolute right-0 z-10 w-72 border border-line bg-white p-2"
            >
              <HelpDoc />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
