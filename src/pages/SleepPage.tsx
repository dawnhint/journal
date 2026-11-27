import { useState } from "react";
import { SleepTracker } from "../components/SleepTracker.tsx";
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

type Props = { profiles: Profiles };

export function SleepPage({ profiles }: Props) {
  const [view, setView] = useState(() => {
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() };
  });
  const { year, month } = view;
  const userId = profiles.activeUserId;

  function changeMonth(direction: number) {
    setView((current) => {
      const target = new Date(current.year, current.month + direction, 1);
      return { year: target.getFullYear(), month: target.getMonth() };
    });
  }

  return (
    <div className="relative flex flex-col pb-5 md:pb-[1.4vw]">
      <main className="flex flex-col gap-5 md:gap-[1.4vw]">
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
              className="ml-1 flex items-center gap-1 text-[#808080]"
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

        <SleepTracker userId={userId} year={year} month={month} />
      </main>
    </div>
  );
}
