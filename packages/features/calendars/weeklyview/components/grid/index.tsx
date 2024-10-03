import React from "react";

import dayjs from "@calcom/dayjs";

type Props = {
  offsetHeight: number | undefined;
  gridStopsPerDay: number;
  children: React.ReactNode;
  zIndex?: number;
};

const UnavailableSlotMarker = () => (
  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
    <span className="text-xl text-gray-300">X</span>
  </div>
);

export const SchedulerColumnsWithX = React.forwardRef<HTMLOListElement, Props>(function SchedulerColumnsWithX(
  { offsetHeight, gridStopsPerDay, days, startHour, endHour, availableTimeslots, timezone },
  ref
) {
  const slotsPerHour = 4; // Assuming 15-minute intervals

  return (
    <ol
      ref={ref}
      className="scheduler-grid-row-template col-start-1 col-end-2 row-start-1 grid auto-cols-auto"
      style={{
        marginTop: offsetHeight || "var(--gridDefaultSize)",
        pointerEvents: "none",
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}>
      {days.map((day, dayIndex) => {
        const dateFormatted = dayjs(day).format("YYYY-MM-DD");
        const slotsForDay = availableTimeslots && availableTimeslots[dateFormatted];

        return (
          <li key={day.toISOString()} className="relative" style={{ gridColumnStart: dayIndex + 1 }}>
            {[...Array(gridStopsPerDay)].map((_, slotIndex) => {
              const slotTime = dayjs(day)
                .hour(startHour)
                .minute(0)
                .add(slotIndex * 15, "minute");
              const slotEnd = slotTime.add(15, "minute");

              const isAvailable = slotsForDay?.some(
                (slot) => dayjs(slot.start).isSame(slotTime) && dayjs(slot.end).isSame(slotEnd)
              );

              return !isAvailable ? (
                <div
                  key={`${dayIndex}-${slotIndex}`}
                  className="absolute left-0 right-0"
                  style={{
                    top: `${(slotIndex / gridStopsPerDay) * 100}%`,
                    height: `${100 / gridStopsPerDay}%`,
                  }}>
                  <UnavailableSlotMarker />
                </div>
              ) : null;
            })}
          </li>
        );
      })}
    </ol>
  );
});
export const SchedulerColumns = React.forwardRef<HTMLOListElement, Props>(function SchedulerColumns(
  { offsetHeight, gridStopsPerDay, children, zIndex },
  ref
) {
  return (
    <ol
      ref={ref}
      className="scheduler-grid-row-template col-start-1 col-end-2 row-start-1 grid auto-cols-auto text-[0px] sm:pr-8"
      style={{ marginTop: offsetHeight || "var(--gridDefaultSize)", zIndex }}
      data-gridstopsperday={gridStopsPerDay}>
      {children}
    </ol>
  );
});
