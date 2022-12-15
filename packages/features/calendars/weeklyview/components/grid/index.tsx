import React from "react";

type Props = {
  offsetHeight: number | undefined;
  gridStopsPerDay: number;
  children: React.ReactNode;
  zIndex?: number;
};

export function SchedulerColumns({ offsetHeight, gridStopsPerDay, children, zIndex }: Props) {
  return (
    <ol
      className="scheduler-grid-row-template col-start-1 col-end-2 row-start-1 grid auto-cols-auto sm:pr-8"
      style={{ marginTop: offsetHeight || "var(--gridDefaultSize)", zIndex }}
      data-gridstopsperday={gridStopsPerDay}>
      {children}
    </ol>
  );
}
