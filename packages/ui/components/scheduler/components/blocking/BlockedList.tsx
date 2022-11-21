import { useId, useMemo } from "react";

import dayjs from "@calcom/dayjs";

import { useSchedulerStore } from "../../state/store";
import { BlockedTimeCell } from "./BlockedTimeCell";

type Props = {
  day: dayjs.Dayjs;
  containerRef: React.RefObject<HTMLDivElement>;
};

function roundX(x: number, roundBy: number) {
  return Math.round(x / roundBy) * roundBy;
}

export function BlockedList({ day }: Props) {
  const { startHour, blockingDates, endHour, gridCellsPerHour } = useSchedulerStore((state) => ({
    startHour: state.startHour || 0,
    endHour: state.endHour || 23,
    blockingDates: state.blockingDates,
    gridCellsPerHour: state.gridCellsPerHour || 4,
  }));

  const dayStart = useMemo(() => day.startOf("day").hour(startHour), [day, startHour]);
  const nowComparedToDayStart = useMemo(() => dayjs().diff(dayStart, "minutes"), [dayStart]);

  return (
    <>
      {day.isBefore(dayjs(), "day") && (
        <div
          key={day.format("YYYY-MM-DD")}
          className="absolute z-40 w-full"
          style={{
            top: `var(--one-minute-height)`,
            zIndex: 60,
            height: `calc(${(endHour + 1 - startHour) * 60} * var(--one-minute-height))`, // Add 1 to endHour to include the last hour that we add to display the last vertical line
          }}>
          <BlockedTimeCell />
        </div>
      )}

      {day.isToday() && (
        <div
          key={day.format("YYYY-MM-DD")}
          className="absolute z-40 w-full"
          style={{
            top: `var(--one-minute-height)`, // Still need this as this var takes into consideration the offset of the "AllDayEvents" bar
            zIndex: 60,
            height: `calc(${roundX(
              nowComparedToDayStart,
              60 / gridCellsPerHour
            )} * var(--one-minute-height) - 2px)`, // We minus the border width to make it 🧹
          }}>
          <BlockedTimeCell />
        </div>
      )}

      {blockingDates &&
        blockingDates.map((event, i) => {
          const eventStart = dayjs(event.start);
          const eventEnd = dayjs(event.end);
          const eventDuration = eventEnd.diff(eventStart, "minutes");

          const eventStartHour = eventStart.hour();
          const eventStartDiff = (eventStartHour - (startHour || 0)) * 60;

          if (!eventStart.isSame(day, "day")) {
            return null;
          }
          console.log({ eventStart: eventStart.toISOString(), eventEnd: eventEnd.toISOString() });

          if (eventStart.isBefore(dayjs())) {
            return null;
          }

          return (
            <div
              key={`${eventStart.toISOString()}-${i}`}
              className="absolute w-full"
              style={{
                zIndex: 60,
                top: `calc(${eventStartDiff}*var(--one-minute-height))`,
                height: `calc(${eventDuration}*var(--one-minute-height))`,
              }}>
              <BlockedTimeCell />
            </div>
          );
        })}
    </>
  );
}
