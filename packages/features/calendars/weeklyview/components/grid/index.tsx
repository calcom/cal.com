import type React from "react";

type Props = {
  offsetHeight: number | undefined;
  gridStopsPerDay: number;
  children: React.ReactNode;
  zIndex?: number;
};

export const SchedulerColumns = function SchedulerColumns({
  offsetHeight,
  gridStopsPerDay,
  children,
  zIndex,
  ref,
}: Props & { ref?: React.RefObject<HTMLOListElement | null> }): JSX.Element {
  return (
    <ol
      ref={ref}
      className="scheduler-grid-row-template scheduler-wrapper col-start-1 col-end-2 row-start-1 grid auto-cols-auto text-[0px]"
      style={{ marginTop: offsetHeight || "var(--calendar-offset-top)", zIndex }}
      data-gridstopsperday={gridStopsPerDay}>
      {children}
    </ol>
  );
};
