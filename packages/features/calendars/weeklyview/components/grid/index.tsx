import React from "react";

type Props = {
  offsetHeight: number | undefined;
  gridStopsPerDay: number;
  children: React.ReactNode;
  zIndex?: number;
};

export const SchedulerColumns = React.forwardRef<HTMLOListElement, Props>(function SchedulerColumns(
  { offsetHeight, gridStopsPerDay, children, zIndex },
  ref
) {
  return (
    <ol
      ref={ref}
      className="scheduler-grid-row-template col-start-1 col-end-2 row-start-1 grid auto-cols-auto text-[0px]"
      style={{ marginTop: offsetHeight || "var(--gridDefaultSize)", zIndex }}
      data-gridstopsperday={gridStopsPerDay}>
      {children}
    </ol>
  );
});
