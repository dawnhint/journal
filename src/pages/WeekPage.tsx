// 周计划视图：侧栏月历、当周格子与月/周总结。
import { useState } from "react";
import { useLocation } from "react-router-dom";
import {
  formatDate,
  getMonth,
  getWeekDates,
  getWeekIndex,
  pad,
  shiftWeek,
} from "../lib/calendar.ts";
import { Note } from "../components/Note.tsx";
import { entryKey, monthSummaryKey, summaryKey } from "../lib/storage/keys.ts";
import type { Profiles } from "../lib/storage/profiles.ts";

type WeekNavState = { year: number; month: number; week: number };

function readInitialView(state: unknown) {
  const nav = state as WeekNavState | null;
  if (
    nav &&
    Number.isInteger(nav.year) &&
    Number.isInteger(nav.month) &&
    Number.isInteger(nav.week) &&
    nav.month >= 0 &&
    nav.month <= 11 &&
    nav.week >= 0
  ) {
    const { weekCount } = getMonth(nav.year, nav.month);
    if (nav.week < weekCount) {
      return { year: nav.year, month: nav.month, week: nav.week };
    }
  }
  const today = new Date();
  return {
    year: today.getFullYear(),
    month: today.getMonth(),
    week: getWeekIndex(today),
  };
}

const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const weekdays = ["一", "二", "三", "四", "五", "六", "日"];
const dayNames = ["Mon", "Tue", "Wed", "Thur", "Fri", "Sat", "Sun"];
const cellOrder = [0, 4, 1, 5, 2, 6, 3, null];

type Props = { profiles: Profiles };

export function WeekPage({ profiles }: Props) {
  const location = useLocation();
  const [view, setView] = useState(() => readInitialView(location.state));
  const { year, month, week } = view;
  const today = new Date();
  const { offset, days, weekCount } = getMonth(year, month);
  const dates = getWeekDates(year, month, week);
  const weekStart = formatDate(dates[0]);
  const weekEnd = formatDate(dates[6]);
  const monthlyKey = monthSummaryKey(
    profiles.activeUserId,
    `${year}-${pad(month + 1)}`,
  );

  function changeWeek(direction: number) {
    setView((current) =>
      shiftWeek(current.year, current.month, current.week, direction),
    );
  }

  function changeMonth(direction: number) {
    setView((current) => {
      const target = new Date(current.year, current.month + direction, 1);
      return { year: target.getFullYear(), month: target.getMonth(), week: 0 };
    });
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <main className="grid gap-8 md:min-h-0 md:flex-1 md:grid-cols-[minmax(15rem,17.5%)_1fr] md:grid-rows-[minmax(0,1fr)] md:gap-x-[2.6%] md:gap-y-0">
        <aside className="flex min-h-0 min-w-0 flex-col md:overflow-y-auto">
          <header className="flex shrink-0 items-baseline gap-4 px-2 md:gap-[1.1vw]">
            <h1 className="text-6xl leading-none font-bold text-p1 md:text-[max(48px,4.4vw)]">
              {monthNames[month]}
            </h1>
            <p
              aria-live="polite"
              className="whitespace-nowrap text-base text-[#808080] md:text-[max(14px,1.1vw)]"
            >
              {month + 1}月 / {year}
            </p>
          </header>

          <div
            className="mt-7 grid shrink-0 grid-cols-7 text-center text-base md:mt-[1.8vw] md:text-[max(14px,1vw)]"
            aria-label={`${year}年${month + 1}月日历`}
          >
            {weekdays.map((day, index) => (
              <span key={day} className={`py-2 ${index > 4 ? "text-p2" : ""}`}>
                {day}
              </span>
            ))}
            {Array.from({ length: offset }, (_, index) => (
              <span key={`empty-${index}`} />
            ))}
            {Array.from({ length: days }, (_, index) => {
              const day = index + 1;
              const weekday = (offset + index) % 7;
              const dayWeek = Math.floor((offset + index) / 7);
              const isToday =
                year === today.getFullYear() &&
                month === today.getMonth() &&
                day === today.getDate();
              const dateColor = isToday
                ? "text-ink"
                : weekday > 4
                  ? "text-p2"
                  : dayWeek === week
                    ? "text-p1"
                    : "";

              return (
                <button
                  key={day}
                  type="button"
                  aria-label={`${month + 1}月${day}日，查看所在周`}
                  aria-current={isToday ? "date" : undefined}
                  onClick={() => setView({ ...view, week: dayWeek })}
                  className={`cursor-pointer py-2 tabular-nums hover:bg-black/5 ${dateColor}`}
                >
                  {pad(day)}
                </button>
              );
            })}
          </div>

          <nav
            aria-label="切换周"
            className="mt-5 flex shrink-0 justify-center divide-x divide-line md:mt-[1.5vw]"
          >
            {Array.from({ length: weekCount }, (_, index) => {
              const isCurrentWeek = getWeekDates(year, month, index).some(
                (date) => formatDate(date) === formatDate(today),
              );
              return (
                <button
                  key={index}
                  type="button"
                  aria-label={`第${index + 1}周`}
                  aria-current={isCurrentWeek ? "true" : undefined}
                  aria-pressed={week === index}
                  onClick={() => setView({ ...view, week: index })}
                  className={`cursor-pointer px-3 py-2 text-base hover:bg-black/5 md:px-[0.65vw] md:text-[max(14px,1vw)] ${isCurrentWeek ? "text-ink" : week === index ? "text-p1" : ""}`}
                >
                  W{index + 1}
                </button>
              );
            })}
          </nav>

          <div className="month-summary mt-8 flex h-30 shrink-0 flex-col md:mt-[2vw] md:h-auto md:min-h-42 md:flex-1">
            <Note
              key={monthlyKey}
              storageKey={monthlyKey}
              label={`${year}年${month + 1}月记录与总结`}
              ruled
            />
          </div>
        </aside>

        <section
          aria-label={`${year}年${month + 1}月第${week + 1}周`}
          className="grid min-h-[44rem] grid-cols-2 grid-rows-4 border-t border-line md:mt-[3.5vw] md:min-h-0"
        >
          {cellOrder.map((dayIndex, index) => {
            const date = dayIndex === null ? null : dates[dayIndex];
            const dateKey = date ? formatDate(date) : null;
            const storageKey = dateKey
              ? entryKey(profiles.activeUserId, dateKey)
              : summaryKey(profiles.activeUserId, weekStart);
            const weekend = dayIndex !== null && dayIndex > 4;

            return (
              <section
                key={dateKey ?? "summary"}
                aria-label={
                  date
                    ? `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
                    : "本周总结"
                }
                className={`flex min-h-0 min-w-0 gap-4 border-b border-line p-4 md:gap-6 md:p-[1.6vw] ${index % 2 === 0 ? "border-r" : ""}`}
              >
                {date && dayIndex !== null ? (
                  <h2
                    className={`flex w-fit shrink-0 flex-col items-center self-start ${weekend ? "text-p2" : ""}`}
                  >
                    <span className="border-b border-line pb-1 text-3xl leading-none tabular-nums md:text-[max(28px,2vw)]">
                      {pad(date.getDate())}
                    </span>
                    <span
                      className={`mt-1 text-base md:text-[max(14px,1vw)] ${weekend ? "text-[#c38776]" : "text-[#c3c3c3]"}`}
                    >
                      {dayNames[dayIndex]}
                    </span>
                  </h2>
                ) : (
                  <h2 className="shrink-0 self-start text-lg text-[#b96149] md:text-[max(16px,1.2vw)]">
                    总结
                  </h2>
                )}
                <Note
                  key={storageKey}
                  storageKey={storageKey}
                  label={
                    dateKey
                      ? `${dateKey} 日记`
                      : `${weekStart} 至 ${weekEnd} 周总结`
                  }
                />
              </section>
            );
          })}
        </section>
      </main>

      <nav
        aria-label="切换月份或周"
        className="flex shrink-0 justify-center gap-4 py-5 md:gap-8"
      >
        {[
          {
            label: "上个月",
            action: () => changeMonth(-1),
            path: "M11 6l-6 6 6 6m8-12-6 6 6 6",
          },
          {
            label: "上一周",
            action: () => changeWeek(-1),
            path: "M19 12H5m6-6-6 6 6 6",
          },
          {
            label: "下一周",
            action: () => changeWeek(1),
            path: "M5 12h14m-6-6 6 6-6 6",
          },
          {
            label: "下个月",
            action: () => changeMonth(1),
            path: "M5 6l6 6-6 6m8-12 6 6-6 6",
          },
        ].map(({ label, action, path }) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            title={label}
            onClick={action}
            className="flex size-11 cursor-pointer items-center justify-center hover:bg-black/5"
          >
            <svg
              aria-hidden="true"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d={path} />
            </svg>
          </button>
        ))}
      </nav>
    </div>
  );
}
