const PLAN_ROWS = 3;

type Props = { days: number };

export function PlanDateTable({ days }: Props) {
  return (
    <section
      aria-label="月度计划表"
      className="shrink-0 overflow-x-auto border border-line"
    >
      <div
        className="grid min-w-[40rem]"
        style={{
          gridTemplateColumns: `4.5rem repeat(${days}, minmax(0, 1fr))`,
        }}
      >
        <div className="plan-date-corner relative border-r border-b border-line">
          <span className="absolute top-1 right-1.5 text-[10px] tracking-wide text-[#888] md:text-[max(10px,0.7vw)]">
            DATE
          </span>
          <span className="absolute bottom-1 left-1.5 text-[10px] tracking-wide text-[#888] md:text-[max(10px,0.7vw)]">
            PLAN
          </span>
        </div>
        {Array.from({ length: days }, (_, index) => (
          <div
            key={`date-${index + 1}`}
            className="border-r border-b border-line py-1.5 text-center text-xs tabular-nums text-[#666] last:border-r-0 md:text-[max(11px,0.75vw)]"
          >
            {index + 1}
          </div>
        ))}
        {Array.from({ length: PLAN_ROWS }, (_, row) => {
          const isLastRow = row === PLAN_ROWS - 1;
          const rowBorder = isLastRow ? "border-r" : "border-r border-b";
          return (
            <div key={`plan-row-${row}`} className="contents">
              <div
                className={`min-h-8 border-line md:min-h-[1.8vw] ${rowBorder}`}
              />
              {Array.from({ length: days }, (_, day) => (
                <div
                  key={`plan-${row}-${day}`}
                  className={`min-h-8 border-line md:min-h-[1.8vw] ${
                    day === days - 1
                      ? isLastRow
                        ? ""
                        : "border-b"
                      : rowBorder
                  }`}
                />
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}
