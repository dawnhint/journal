import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { getMonth, pad } from "../lib/calendar.ts";
import {
  loadSleepMonth,
  saveSleepMonth,
  type SleepMonthData,
  type SleepPeriod,
} from "../lib/storage/sleep.ts";

const HOURS = [
  "22",
  "23",
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "20",
  "21",
];

const HOUR_LABELS = [
  "10 PM",
  "11",
  "12",
  "1 AM",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "1 PM",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
];

const COLORS = ["bg-[#73c5ed]/70", "bg-[#F59B9C]/70"] as const;
const HANDLE_COLORS = ["bg-[#73c5ed]", "bg-[#F59B9C]"] as const;
const PREVIEW_COLORS = ["bg-[#73c5ed]/30", "bg-[#F59B9C]/30"] as const;

/** 按日期奇偶交替：1 蓝、2 粉、3 蓝… */
function colorForDay(day: number) {
  return COLORS[(day - 1) % 2];
}

function handleColorForDay(day: number) {
  return HANDLE_COLORS[(day - 1) % 2];
}

function previewColorForDay(day: number) {
  return PREVIEW_COLORS[(day - 1) % 2];
}

// 默认 8 小时；右边缘时保证时长 >= 1h（必要时前移起点）
function getDefaultRange(hour: number) {
  const endHour = Math.min(hour + 8, HOURS.length);
  const startHour = Math.min(hour, endHour - 1);
  return { startHour, endHour };
}

// 结束时间过于靠右时，外置 2rem 删除按钮会溢出到 HOUR SLEPT 列
const DELETE_INSIDE_FROM_HOUR = HOURS.length - 1;

const GRID_COLS = "grid-cols-[60px_1fr_100px_120px_200px]";

type DragType = "start" | "end" | "move";
type DragState = {
  day: number;
  dragType: DragType;
  startX: number;
  originalStart: number;
  originalEnd: number;
};
type Preview = { day: number; startHour: number; endHour: number };

type Props = { userId: string; year: number; month: number };

export function SleepTracker({ userId, year, month }: Props) {
  const yearMonth = `${year}-${pad(month + 1)}`;
  // 切换用户 / 月份时用 key 重置状态，重新从本地存储读取。
  return (
    <SleepTrackerMonth
      key={`${userId}|${yearMonth}`}
      userId={userId}
      yearMonth={yearMonth}
      daysInMonth={getMonth(year, month).days}
    />
  );
}

function SleepTrackerMonth({
  userId,
  yearMonth,
  daysInMonth,
}: {
  userId: string;
  yearMonth: string;
  daysInMonth: number;
}) {
  const [loaded] = useState(() =>
    loadSleepMonth(localStorage, userId, yearMonth),
  );
  const [data, setData] = useState<SleepMonthData>(loaded.data);
  const [error, setError] = useState(loaded.error);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [hoverPreview, setHoverPreview] = useState<Preview | null>(null);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  // 用 ref 保存最新数据，同一 tick 内多次修改基于最新值，避免相互覆盖。
  const dataRef = useRef<SleepMonthData>(loaded.data);

  const persist = useCallback(
    (update: (current: SleepMonthData) => SleepMonthData) => {
      const next = update(dataRef.current);
      dataRef.current = next;
      const message = saveSleepMonth(localStorage, userId, yearMonth, next);
      setData(next);
      setError(message);
    },
    [userId, yearMonth],
  );

  const getHourFromPosition = useCallback((x: number) => {
    if (!gridRef.current) return 0;
    const rect = gridRef.current.getBoundingClientRect();
    const cellWidth = rect.width / HOURS.length;
    return Math.max(
      0,
      Math.min(HOURS.length - 1, Math.floor((x - rect.left) / cellWidth)),
    );
  }, []);

  const handleMouseDown = (
    e: React.MouseEvent,
    day: number,
    dragType: DragType,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const period = data.periods.find((item) => item.day === day);
    if (!period) return;
    setDragState({
      day,
      dragType,
      startX: e.clientX,
      originalStart: period.startHour,
      originalEnd: period.endHour,
    });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragState || !gridRef.current) return;
      const { day, dragType, originalStart, originalEnd } = dragState;
      const currentHour = getHourFromPosition(e.clientX);
      const current = dataRef.current;
      const index = current.periods.findIndex((item) => item.day === day);
      if (index === -1) return;
      const item: SleepPeriod = { ...current.periods[index] };

      if (dragType === "start") {
        item.startHour = Math.min(currentHour, item.endHour - 1);
      } else if (dragType === "end") {
        item.endHour = Math.max(currentHour + 1, item.startHour + 1);
      } else {
        const cellWidth =
          gridRef.current.getBoundingClientRect().width / HOURS.length;
        const hourDelta = Math.round(
          (e.clientX - dragState.startX) / cellWidth,
        );
        const duration = originalEnd - originalStart;
        let newStart = originalStart + hourDelta;
        let newEnd = originalEnd + hourDelta;
        if (newStart < 0) {
          newStart = 0;
          newEnd = duration;
        }
        if (newEnd > HOURS.length) {
          newEnd = HOURS.length;
          newStart = newEnd - duration;
        }
        if (newStart < 0) newStart = 0;
        item.startHour = newStart;
        item.endHour = newEnd;
      }

      if (
        item.startHour === current.periods[index].startHour &&
        item.endHour === current.periods[index].endHour
      )
        return;
      persist((latest) => {
        const periods = latest.periods.map((p) => (p.day === day ? item : p));
        return { ...latest, periods };
      });
    },
    [dragState, getHourFromPosition, persist],
  );

  const handleMouseUp = useCallback(() => setDragState(null), []);

  useEffect(() => {
    if (!dragState) return;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragState, handleMouseMove, handleMouseUp]);

  function addSleepPeriod(day: number, hour: number) {
    if (data.periods.some((item) => item.day === day)) return;
    const period: SleepPeriod = {
      day,
      ...getDefaultRange(hour),
      color: colorForDay(day),
    };
    setHoverPreview(null);
    persist((current) =>
      current.periods.some((item) => item.day === day)
        ? current
        : {
            ...current,
            periods: [...current.periods, period].sort((a, b) => a.day - b.day),
          },
    );
  }

  function deleteSleepPeriod(day: number) {
    setHoveredDay(null);
    persist((current) => ({
      ...current,
      periods: current.periods.filter((item) => item.day !== day),
    }));
  }

  function setEnergy(day: number, rating: number) {
    persist((current) => ({
      ...current,
      energy: { ...current.energy, [String(day)]: rating },
    }));
  }

  function setNote(day: number, value: string) {
    persist((current) => ({
      ...current,
      notes: { ...current.notes, [String(day)]: value },
    }));
  }

  function handleCellMouseEnter(day: number, hour: number) {
    if (data.periods.some((item) => item.day === day)) return;
    setHoverPreview({
      day,
      ...getDefaultRange(hour),
    });
  }

  return (
    <div className="px-2 md:px-[0.6vw]">
      {error && (
        <p role="alert" className="mb-4 text-sm text-red-600">
          {error}
        </p>
      )}
      {/* 随页面自然滚动；表头 sticky 相对视口，避免内层 overflow 打断 */}
      <div className="min-w-[1200px]">
        <div className="sticky top-0 z-10 bg-[#f7f6f4]">
          <div className={`grid ${GRID_COLS} gap-0 border-t border-b border-gray-300`}>
            <div />
            <div className="flex">
              <div className="flex-[1] border-r border-gray-300 py-2 text-center">
                <div className="text-xs font-medium">PM</div>
              </div>
              <div className="flex-[6] border-r border-gray-300 py-2 text-center">
                <div className="text-xs font-medium">AM</div>
              </div>
              <div className="flex-[5] py-2 text-center">
                <div className="text-xs font-medium">PM</div>
              </div>
            </div>
            <div />
            <div />
            <div />
          </div>

          <div className={`grid ${GRID_COLS} gap-0 border-b border-gray-300`}>
            {/* 竖线画在日期列右边，与下方日期行 border-r 对齐；勿加在小时 flex 上以免整体右移 1px */}
            <div className="border-r border-gray-200" />
            <div ref={gridRef} className="flex">
              {HOUR_LABELS.map((hour, index) => (
                <div
                  key={index}
                  className="flex-1 border-r border-gray-200 py-1 text-center text-xs last:border-r-0"
                >
                  {hour.split(" ")[0]}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center border-l border-gray-300 py-1 text-xs font-medium">
              HOUR
            </div>
            <div className="flex items-center justify-center border-l border-gray-300 py-1 text-xs font-medium">
              ENERGY
            </div>
            <div className="flex items-center justify-center border-l border-gray-300 py-1 text-xs font-medium">
              NOTES
            </div>
          </div>
        </div>

          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
            const sleepPeriod = data.periods.find((item) => item.day === day);
            const currentRating = data.energy[String(day)] || 0;
            const color = sleepPeriod ? colorForDay(day) : "";
            const handleColor = sleepPeriod ? handleColorForDay(day) : "";
            const handlesActive = hoveredDay === day || dragState?.day === day;

            return (
              <div
                key={day}
                className={`grid ${GRID_COLS} gap-0 border-b border-gray-200 hover:bg-black/[0.03]`}
              >
                <div className="border-r border-gray-200 py-3 text-center font-medium">
                  {day}
                </div>

                <div className="relative flex h-12">
                  {HOURS.map((_, hourIndex) => (
                    <div
                      key={hourIndex}
                      className="flex-1 cursor-pointer border-r border-gray-100 last:border-r-0"
                      onClick={() =>
                        !sleepPeriod && addSleepPeriod(day, hourIndex)
                      }
                      onMouseEnter={() =>
                        handleCellMouseEnter(day, hourIndex)
                      }
                      onMouseLeave={() => setHoverPreview(null)}
                    />
                  ))}

                  {hoverPreview &&
                    hoverPreview.day === day &&
                    !sleepPeriod && (
                      <div
                        className={`pointer-events-none absolute top-2 bottom-2 rounded ${previewColorForDay(day)}`}
                        style={{
                          left: `${(hoverPreview.startHour / HOURS.length) * 100}%`,
                          width: `${((hoverPreview.endHour - hoverPreview.startHour) / HOURS.length) * 100}%`,
                        }}
                      />
                    )}

                  {sleepPeriod &&
                    (() => {
                      const deleteInside =
                        sleepPeriod.endHour >= DELETE_INSIDE_FROM_HOUR;
                      return (
                        <div
                          className="absolute inset-y-0"
                          style={{
                            left: `${(sleepPeriod.startHour / HOURS.length) * 100}%`,
                            // 悬停区 = 真实时长 + 右侧 2rem 删除按钮区域
                            width: `calc(${((sleepPeriod.endHour - sleepPeriod.startHour) / HOURS.length) * 100}%${deleteInside ? "" : " + 2rem"})`,
                          }}
                          onMouseEnter={() => setHoveredDay(day)}
                          onMouseLeave={() => setHoveredDay(null)}
                        >
                          <div
                            className={`absolute top-2 bottom-2 left-0 ${deleteInside ? "w-full" : "w-[calc(100%-2rem)]"} ${color} flex cursor-move items-center justify-between rounded select-none`}
                            onMouseDown={(e) => handleMouseDown(e, day, "move")}
                          >
                            <div
                              className={`h-full w-2 cursor-ew-resize rounded-l transition-colors ${
                                handlesActive ? handleColor : "bg-transparent"
                              }`}
                              onMouseDown={(e) =>
                                handleMouseDown(e, day, "start")
                              }
                            />
                            <div className="flex flex-1 items-center justify-center text-xs font-medium text-ink/80">
                              {sleepPeriod.endHour - sleepPeriod.startHour}h
                            </div>
                            <div
                              className={`h-full w-2 cursor-ew-resize rounded-r transition-colors ${
                                handlesActive ? handleColor : "bg-transparent"
                              }`}
                              onMouseDown={(e) =>
                                handleMouseDown(e, day, "end")
                              }
                            />
                          </div>
                          {hoveredDay === day && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteSleepPeriod(day);
                              }}
                              className={`absolute top-1/2 ${deleteInside ? "right-2" : "right-1"} z-10 flex h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-red-500 text-xs text-white transition-colors hover:bg-red-600`}
                              title="删除睡眠记录"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      );
                    })()}
                </div>

                <div className="flex items-center justify-center border-l border-gray-200 py-2">
                  {sleepPeriod
                    ? `${sleepPeriod.endHour - sleepPeriod.startHour}h`
                    : ""}
                </div>

                <div className="flex items-center justify-center border-l border-gray-200 py-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      aria-label={`第 ${day} 天精力 ${rating}`}
                      onClick={() => setEnergy(day, rating)}
                      className={`mx-1 h-4 w-4 cursor-pointer rounded-full border border-gray-400 transition-colors hover:scale-110 ${
                        rating <= currentRating
                          ? "border-amber-500 bg-amber-400"
                          : "bg-transparent hover:bg-black/5"
                      }`}
                    />
                  ))}
                </div>

                <div className="flex items-center border-l border-gray-200 px-2 py-2">
                  <input
                    type="text"
                    aria-label={`第 ${day} 天备注`}
                    value={data.notes[String(day)] ?? ""}
                    onChange={(e) => setNote(day, e.target.value)}
                    className={`h-6 w-full bg-transparent text-xs outline-none focus:border-b focus:border-p1 ${
                      (data.notes[String(day)] ?? "").trim()
                        ? "border-b border-gray-200"
                        : "border-b border-transparent"
                    }`}
                  />
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
