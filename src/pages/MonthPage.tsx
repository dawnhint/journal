// 月历视图：格子笔记与周视图数据独立；点日期进入对应周。
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Note } from "../components/Note.tsx";
import { PlanDateTable } from "../components/PlanDateTable.tsx";
import { formatDate, getMonth, getWeekIndex, pad } from "../lib/calendar.ts";
import { monthDayKey, monthWeekKey } from "../lib/storage/keys.ts";
import type { Profiles } from "../lib/storage/profiles.ts";

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
const dayHeaders = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const WEEK_ROWS = 6;

function buildMonthCells(year: number, month: number) {
  const { offset } = getMonth(year, month);
  return Array.from({ length: WEEK_ROWS }, (_, week) =>
    Array.from({ length: 7 }, (_, weekday) => {
      const date = new Date(year, month, 1 - offset + week * 7 + weekday);
      return {
        date,
        day: date.getDate(),
        inMonth: date.getMonth() === month,
      };
    }),
  );
}

type Props = { profiles: Profiles };

export function MonthPage({ profiles }: Props) {
  const navigate = useNavigate();
  const [view, setView] = useState(() => {
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() };
  });
  const { year, month } = view;
  const { days } = getMonth(year, month);
  const cells = buildMonthCells(year, month);
  const showPlanTable = false;
  const userId = profiles.activeUserId;

  function changeMonth(direction: number) {
    setView((current) => {
      const target = new Date(current.year, current.month + direction, 1);
      return { year: target.getFullYear(), month: target.getMonth() };
    });
  }

  function openWeek(week: number) {
    navigate("/", { state: { year, month, week } });
  }

  function openDate(date: Date) {
    navigate("/", {
      state: {
        year: date.getFullYear(),
        month: date.getMonth(),
        week: getWeekIndex(date),
      },
    });
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col pb-5 md:pb-[1.4vw]">
      <main className="flex min-h-0 flex-1 flex-col gap-5 md:gap-[1.4vw]">
        <header className="flex shrink-0 items-baseline gap-4 px-2 md:gap-[1.1vw]">
          <h1 className="w-[4ex] text-6xl leading-none font-bold text-p1 md:text-[max(48px,4.4vw)]">
            {monthNames[month]}
          </h1>
          <div className="flex items-center gap-1.5 md:gap-[0.35vw]">
            <p
              aria-live="polite"
              className="whitespace-nowrap text-base text-[#808080] md:text-[max(14px,1.1vw)]"
            >
              {month + 1}月 / {year}
            </p>
            <nav
              aria-label="切换月份"
              className="ml-1 flex items-center text-[#808080] gap-1"
            >
              {[
                {
                  label: "上个月",
                  action: () => changeMonth(-1),
                  path: "M19 12H5m6-6-6 6 6 6",
                },
                {
                  label: "下个月",
                  action: () => changeMonth(1),
                  path: "M5 12h14m-6-6 6 6-6 6",
                },
              ].map(({ label, action, path }) => (
                <button
                  key={label}
                  type="button"
                  aria-label={label}
                  title={label}
                  onClick={action}
                  className="flex size-6 cursor-pointer items-center justify-center hover:text-ink md:size-[max(1.25rem,1.35vw)]"
                >
                  <svg
                    aria-hidden="true"
                    width="18"
                    height="18"
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
        </header>

        {showPlanTable && <PlanDateTable days={days} />}

        <div className="month-board">
          <section
            aria-label={`${year}年${month + 1}月周总结`}
            className="month-summary-table"
          >
            <div className="month-summary-table__head flex items-center text-sm text-ink md:text-[max(13px,0.95vw)]">
              Plan
            </div>
            {Array.from({ length: WEEK_ROWS }, (_, week) => {
              const isLastRow = week === WEEK_ROWS - 1;
              const weekKey = monthWeekKey(userId, year, month, week);
              return (
                <div
                  key={`summary-${week}`}
                  className={`month-summary-table__cell flex min-h-0 items-stretch py-1.5 pr-1.5 pl-0 md:py-[0.4vw] md:pr-[0.4vw]${isLastRow ? " month-summary-table__cell--last" : ""}`}
                >
                  <button
                    type="button"
                    aria-label={`第${week + 1}周，打开周视图`}
                    title="打开周视图"
                    onClick={() => openWeek(week)}
                    className="flex aspect-square size-[25px] shrink-0 self-start cursor-pointer items-center justify-center rounded-full text-[12px] leading-none text-[#808080] hover:bg-black/5"
                  >
                    W{week + 1}
                  </button>
                  <Note
                    key={weekKey}
                    storageKey={weekKey}
                    label={`${year}年${month + 1}月第${week + 1}周月历总结`}
                    className="py-1.5 text-[13px] leading-[13px] !text-[#555] md:py-[0.4vw]"
                  />
                </div>
              );
            })}
          </section>

          <section
            aria-label={`${year}年${month + 1}月月历`}
            className="month-calendar"
          >
            {dayHeaders.map((label) => (
              <div
                key={label}
                className="month-calendar__head flex items-center text-sm text-ink md:text-[max(13px,0.95vw)]"
              >
                {label}
              </div>
            ))}

            {cells.map((weekDays, week) => {
              const isLastRow = week === WEEK_ROWS - 1;
              const cellClass = `month-calendar__cell${isLastRow ? " month-calendar__cell--last" : ""}`;
              return (
                <div key={`week-${week}`} className="contents">
                  {weekDays.map(({ date, day, inMonth }, weekday) => {
                    const dateKey = formatDate(date);
                    const storageKey = monthDayKey(userId, dateKey);
                    const dayColor = !inMonth
                      ? "text-[#c3c3c3]"
                      : weekday > 4
                        ? "text-p2"
                        : "text-ink";

                    return (
                      <div
                        key={`cell-${week}-${weekday}`}
                        className={`${cellClass} flex min-h-0 flex-col items-stretch py-0.5 pr-0.5 pl-0 md:gap-0.5 md:flex-row md:py-[0.4vw] md:pr-[0.4vw]`}
                      >
                        <button
                          type="button"
                          aria-label={`${date.getMonth() + 1}月${day}日，打开所在周`}
                          title="打开所在周"
                          onClick={() => openDate(date)}
                          className={`flex aspect-square size-[25px] shrink-0 self-start cursor-pointer items-center justify-center rounded-full text-[13px] leading-none tabular-nums hover:bg-black/5 ${dayColor}`}
                        >
                          {pad(day)}
                        </button>
                        <Note
                          key={storageKey}
                          storageKey={storageKey}
                          label={`${dateKey} 月历笔记`}
                          className="md:py-1.5 text-[13px] leading-[13px] !text-[#555]"
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </section>
        </div>
      </main>
    </div>
  );
}
