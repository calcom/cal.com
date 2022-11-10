import { useId, useMemo } from "react";

import dayjs from "@calcom/dayjs";

import { useSchedulerStore } from "../../state/store";
import { BlockedTimeCell } from "./BlockedTimeCell";

type Props = {
  days: dayjs.Dayjs[];
  numberOfGridStopsPerCell: number;
};

export function BlockedList({ days, numberOfGridStopsPerCell }: Props) {
  const { startHour, endHour, blockingDates } = useSchedulerStore((state) => ({
    startHour: state.startHour || 0,
    endHour: state.endHour || 23,
    blockingDates: state.blockingDates,
  }));
  const id = useId();

  const daysLessThanCurrent = useMemo(() => days.filter((day) => day.isBefore(dayjs(), "day")), [days]);

  return (
    <>
      {daysLessThanCurrent.map((day, dayIdx) => {
        return (
          <div
            key={day.format("YYYY-MM-DD")}
            className="sm:col-start-1s relative flex "
            style={{
              gridRow: `2 / span ${(startHour + endHour) * numberOfGridStopsPerCell}`,
              // Need to figure out how to put this in a media query
              gridColumnStart: dayIdx + 1,
            }}>
            <BlockedTimeCell />
          </div>
        );
      })}

      {blockingDates &&
        blockingDates.map((event, i) => {
          const foundDay = days.findIndex((day) => day.get("d") === i);
          if (foundDay === -1) return null;

          const eventStart = dayjs(event.start);
          const eventEnd = dayjs(event.end);
          const eventStartHour = eventStart.hour();
          const eventStartDiff = eventStartHour - (startHour || 0);

          const eventDuration = eventEnd.diff(eventStart, "minutes");
          const gridSpan = Math.round(eventDuration / (60 / numberOfGridStopsPerCell));
          const gridRowStart = eventStartDiff * numberOfGridStopsPerCell;

          return (
            <div
              key={id}
              className="sm:col-start-1s relative flex "
              style={{
                gridRow: `${gridRowStart + 2} / span ${gridSpan}`,
                // Need to figure out how to put this in a media query
                gridColumnStart: foundDay + 1,
              }}>
              <BlockedTimeCell />
            </div>
          );
        })}
    </>
  );
}
