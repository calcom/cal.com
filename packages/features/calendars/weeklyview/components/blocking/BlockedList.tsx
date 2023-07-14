import { useMemo } from "react";
import { shallow } from "zustand/shallow";

import dayjs from "@calcom/dayjs";

import { useCalendarStore } from "../../state/store";
import { BlockedTimeCell } from "./BlockedTimeCell";

type Props = {
  day: dayjs.Dayjs;
  containerRef: React.RefObject<HTMLDivElement>;
};

function roundX(x: number, roundBy: number) {
  return Math.round(x / roundBy) * roundBy;
}

type BlockedDayProps = {
  startHour: number;
  endHour: number;
  day: dayjs.Dayjs;
};

function BlockedBeforeToday({ day, startHour, endHour }: BlockedDayProps) {
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
    </>
  );
}
function BlockedToday({
  day,
  startHour,
  gridCellsPerHour,
  endHour,
}: BlockedDayProps & { gridCellsPerHour: number }) {
  const dayStart = useMemo(() => day.startOf("day").hour(startHour), [day, startHour]);
  const dayEnd = useMemo(() => day.startOf("day").hour(endHour), [day, endHour]);
  const dayEndInMinutes = useMemo(() => dayEnd.diff(dayStart, "minutes"), [dayEnd, dayStart]);
  let nowComparedToDayStart = useMemo(() => dayjs().diff(dayStart, "minutes"), [dayStart]);

  if (nowComparedToDayStart > dayEndInMinutes) nowComparedToDayStart = dayEndInMinutes;

  return (
    <>
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
    </>
  );
}

export function BlockedList({ day }: Props) {
  const { startHour, blockingDates, endHour, gridCellsPerHour } = useCalendarStore(
    (state) => ({
      startHour: state.startHour || 0,
      endHour: state.endHour || 23,
      blockingDates: state.blockingDates,
      gridCellsPerHour: state.gridCellsPerHour || 4,
    }),
    shallow
  );

  return (
    <>
      <BlockedBeforeToday day={day} startHour={startHour} endHour={endHour} />
      <BlockedToday gridCellsPerHour={gridCellsPerHour} day={day} startHour={startHour} endHour={endHour} />
      {blockingDates &&
        blockingDates.map((event, i) => {
          const dayStart = day.startOf("day").hour(startHour);
          const blockingStart = dayjs(event.start);
          const eventEnd = dayjs(event.end);

          const eventStart = dayStart.isAfter(blockingStart) ? dayStart : blockingStart;

          if (!eventStart.isSame(day, "day")) {
            return null;
          }

          if (eventStart.isBefore(dayjs())) {
            if (eventEnd.isBefore(dayjs())) {
              return null;
            }
          }

          const eventDuration = eventEnd.diff(eventStart, "minutes");

          const eventStartHour = eventStart.hour();
          const eventStartDiff = (eventStartHour - (startHour || 0)) * 60;

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
