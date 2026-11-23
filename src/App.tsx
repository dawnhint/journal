import { useState } from "react";
import { getMonth, getWeekDates, getWeekIndex, shiftWeek } from "./calendar";
import { JournalEntry } from "./JournalEntry";
import { UserMenu } from "./UserMenu";
import { entryKey, loadProfiles, monthSummaryKey, summaryKey } from "./users";
import type { Profiles } from "./users";

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
const pad = (day: number) => String(day).padStart(2, "0");
const formatDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

function readProfiles(): { profiles: Profiles | null; error: string } {
  try {
    return { profiles: loadProfiles(localStorage), error: "" };
  } catch (error) {
    return {
      profiles: null,
      error:
        error instanceof Error
          ? error.message
          : "无法读取本地用户数据，请重试。",
    };
  }
}

function App() {
  const [account, setAccount] = useState(readProfiles);
  const [view, setView] = useState(() => {
    const today = new Date();
    return {
      year: today.getFullYear(),
      month: today.getMonth(),
      week: getWeekIndex(today),
    };
  });
  const { year, month, week } = view;
  const today = new Date();
  const { offset, days, weekCount } = getMonth(year, month);
  const dates = getWeekDates(year, month, week);
  const weekStart = formatDate(dates[0]);
  const weekEnd = formatDate(dates[6]);

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

  if (!account.profiles) {
    return (
      <div className="p-5">
        <p role="alert">{account.error}</p>
        <button
          type="button"
          onClick={() => setAccount(readProfiles())}
          className="cursor-pointer px-3 py-2 hover:bg-black/5"
        >
          重试
        </button>
      </div>
    );
  }
  const profiles = account.profiles;
  const monthlyKey = monthSummaryKey(
    profiles.activeUserId,
    `${year}-${pad(month + 1)}`,
  );

  return (
    <div className="relative px-5 pt-6 md:flex md:h-svh md:flex-col md:px-[2.2vw] md:pt-[2.6vw]">
      <UserMenu
        profiles={profiles}
        onChange={(next) => setAccount({ profiles: next, error: "" })}
      />
      <main className="grid gap-8 md:min-h-0 md:flex-1 md:grid-cols-[minmax(15rem,17.5%)_1fr] md:grid-rows-[minmax(0,1fr)] md:gap-x-[2.6%] md:gap-y-0">
        <aside className="flex min-h-0 min-w-0 flex-col md:overflow-y-auto">
          <header className="flex shrink-0 items-baseline gap-4 px-2 md:gap-[1.1vw]">
            <h1 className="text-6xl leading-none font-bold text-[#1966a7] md:text-[max(48px,4.4vw)]">
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
              <span
                key={day}
                className={`py-2 ${index > 4 ? "text-[#a83d27]" : ""}`}
              >
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
                ? "text-[#111]"
                : weekday > 4
                  ? "text-[#a83d27]"
                  : dayWeek === week
                    ? "text-[#1966a7]"
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
            className="mt-5 flex shrink-0 justify-center divide-x divide-[#aaa] md:mt-[1.5vw]"
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
                  className={`cursor-pointer px-3 py-2 text-base hover:bg-black/5 md:px-[0.65vw] md:text-[max(14px,1vw)] ${isCurrentWeek ? "text-[#111]" : week === index ? "text-[#1966a7]" : ""}`}
                >
                  W{index + 1}
                </button>
              );
            })}
          </nav>

          <div className="month-summary mt-8 flex h-30 shrink-0 flex-col md:mt-[2vw] md:h-auto md:min-h-42 md:flex-1">
            <JournalEntry
              key={monthlyKey}
              storageKey={monthlyKey}
              label={`${year}年${month + 1}月记录与总结`}
              ruled
            />
          </div>
        </aside>

        <section
          aria-label={`${year}年${month + 1}月第${week + 1}周`}
          className="grid min-h-[44rem] grid-cols-2 grid-rows-4 border-t border-[#aaa] md:mt-[3.5vw] md:min-h-0"
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
                className={`flex min-h-0 min-w-0 gap-4 md:gap-6 border-b border-[#aaa] p-4 md:p-[1.6vw] ${index % 2 === 0 ? "border-r" : ""}`}
              >
                {date && dayIndex !== null ? (
                  <h2
                    className={`flex w-fit shrink-0 flex-col items-center self-start ${weekend ? "text-[#a83d27]" : ""}`}
                  >
                    <span className="border-b border-[#aaa] pb-1 text-3xl leading-none tabular-nums md:text-[max(28px,2vw)]">
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
                <JournalEntry
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

export default App;
