import { parseDateKey } from "./calendar.ts";
import { RECORD_KINDS, recordPrefix } from "./storage/keys.ts";
import type { RecordKind } from "./storage/keys.ts";

type JournalRecord = { kind: RecordKind; date: string; text: string };

const displayDate = (value: string) => value.replaceAll("-", ".");

export function buildJournalExport(storage: Storage, userId: string) {
  const records: JournalRecord[] = [];
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (!key) continue;
    for (const kind of RECORD_KINDS) {
      const prefix = recordPrefix(kind, userId);
      if (!key.startsWith(prefix)) continue;
      const date = key.slice(prefix.length);
      const validDate =
        kind === "month-summary"
          ? /^\d{4}-\d{2}$/.test(date) && parseDateKey(`${date}-01`)
          : kind === "month-week"
            ? /^\d{4}-\d{2}-w\d+$/.test(date)
            : parseDateKey(date);
      const text = storage.getItem(key);
      if (validDate && text?.trim()) records.push({ kind, date, text });
    }
  }

  const priority: Record<RecordKind, number> = {
    "month-summary": 0,
    summary: 1,
    entry: 2,
    "month-day": 3,
    "month-week": 4,
  };
  records.sort(
    (a, b) =>
      a.date.localeCompare(b.date) || priority[a.kind] - priority[b.kind]
  );
  const blocks: string[] = [];
  let month = "";
  for (const record of records) {
    const recordMonth = record.date.slice(0, 7);
    if (month !== recordMonth) {
      month = recordMonth;
      blocks.push(`——  ${displayDate(month)} ——`);
    }
    if (record.kind === "month-summary") {
      blocks.push(record.text);
    } else if (record.kind === "summary") {
      const end = parseDateKey(record.date)!;
      end.setUTCDate(end.getUTCDate() + 6);
      blocks.push(
        `${displayDate(record.date)}-${displayDate(
          end.toISOString().slice(0, 10)
        )}\n${record.text}`
      );
    } else if (record.kind === "month-week") {
      blocks.push(`${record.date}\n${record.text}`);
    } else {
      blocks.push(`${displayDate(record.date)}\n${record.text}`);
    }
  }

  const now = new Date();
  const exportedAt = `${now.getFullYear()}年${
    now.getMonth() + 1
  }月${now.getDate()}日 导出`;

  return {
    text: blocks.length ? `${exportedAt}\n\n\n${blocks.join("\n\n\n")}\n` : "",
    total: records.length,
    entries: records.filter((record) => record.kind === "entry").length,
    summaries: records.filter((record) => record.kind === "summary").length,
    monthSummaries: records.filter((record) => record.kind === "month-summary")
      .length,
    monthDays: records.filter((record) => record.kind === "month-day").length,
    monthWeeks: records.filter((record) => record.kind === "month-week").length,
  };
}

export function downloadJournal(text: string, userName: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const safeName =
    Array.from(userName, (char) =>
      char.charCodeAt(0) < 32 || '<>:"/\\|?*'.includes(char) ? "_" : char
    )
      .join("")
      .trim() || "journal";
  link.href = url;
  link.download = `${safeName}-日记.txt`;
  try {
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
