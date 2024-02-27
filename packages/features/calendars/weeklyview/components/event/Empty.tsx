import { useMemo } from "react";
import { shallow } from "zustand/shallow";

import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { useTimePreferences } from "@calcom/features/bookings/lib";
import { classNames } from "@calcom/lib";

import { OutOfOfficeInSlots } from "../../../../bookings/Booker/components/OutOfOfficeInSlots";
import { useCalendarStore } from "../../state/store";
import type { CalendarAvailableTimeslots } from "../../types/state";
import type { GridCellToDateProps } from "../../utils";
import { gridCellToDateTime } from "../../utils";

type EmptyCellProps = GridCellToDateProps & {
  isDisabled?: boolean;
  topOffsetMinutes?: number;
};

export function EmptyCell(props: EmptyCellProps) {
  const cellToDate = gridCellToDateTime({
    day: props.day,
    gridCellIdx: props.gridCellIdx,
    totalGridCells: props.totalGridCells,
    selectionLength: props.selectionLength,
    startHour: props.startHour,
    timezone: props.timezone,
  });

  const minutesFromStart = (cellToDate.hour() - props.startHour) * 60 + cellToDate.minute();

  return <Cell topOffsetMinutes={minutesFromStart} timeSlot={dayjs(cellToDate).tz(props.timezone)} />;
}

type AvailableCellProps = {
  availableSlots: CalendarAvailableTimeslots;
  day: GridCellToDateProps["day"];
  startHour: GridCellToDateProps["startHour"];
};

export function AvailableCellsForDay({ availableSlots, day, startHour }: AvailableCellProps) {
  const { timezone } = useTimePreferences();
  const date = dayjs(day);
  const dateFormatted = date.format("YYYY-MM-DD");
  const slotsForToday = availableSlots && availableSlots[dateFormatted];

  const slots = useMemo(
    () =>
      slotsForToday?.map((slot) => ({
        slot,
        topOffsetMinutes:
          (dayjs(slot.start).tz(timezone).hour() - startHour) * 60 + dayjs(slot.start).tz(timezone).minute(),
      })),
    [slotsForToday, startHour, timezone]
  );

  if (!availableSlots) return null;

  const [firstSlot] = availableSlots[dateFormatted] || [];

  if (firstSlot?.away) {
    return (
      <CustomCell timeSlot={dayjs(firstSlot.start).tz(timezone)} topOffsetMinutes={slots[0].topOffsetMinutes}>
        <OutOfOfficeInSlots
          fromUser={firstSlot?.fromUser}
          toUser={firstSlot?.toUser}
          returnDate="2022-01-01"
          emojiStatus="🏖️"
          borderDashed={false}
          date={dateFormatted}
        />
      </CustomCell>
    );
  }

  return (
    <>
      {slots?.map((slot, index) => {
        const { slot: slotData } = slot;
        return (
          <Cell
            key={index}
            timeSlot={dayjs(slotData.start).tz(timezone)}
            topOffsetMinutes={slot.topOffsetMinutes}
          />
        );
      })}
    </>
  );
}

type CellProps = {
  isDisabled?: boolean;
  topOffsetMinutes?: number;
  timeSlot: Dayjs;
};

function Cell({ isDisabled, topOffsetMinutes, timeSlot }: CellProps) {
  const { timeFormat } = useTimePreferences();

  const { onEmptyCellClick, hoverEventDuration } = useCalendarStore(
    (state) => ({
      onEmptyCellClick: state.onEmptyCellClick,
      hoverEventDuration: state.hoverEventDuration,
    }),
    shallow
  );

  return (
    <div
      className={classNames(
        "group flex w-[calc(100%-1px)] items-center justify-center",
        isDisabled && "pointer-events-none",
        !isDisabled && "bg-default dark:bg-muted",
        topOffsetMinutes && "absolute"
      )}
      data-disabled={isDisabled}
      data-slot={timeSlot.toISOString()}
      data-testid="calendar-empty-cell"
      style={{
        height: `calc(${hoverEventDuration}*var(--one-minute-height))`,
        overflow: "visible",
        top: topOffsetMinutes ? `calc(${topOffsetMinutes}*var(--one-minute-height))` : undefined,
      }}
      onClick={() => {
        onEmptyCellClick && onEmptyCellClick(timeSlot.toDate());
      }}>
      {!isDisabled && hoverEventDuration !== 0 && (
        <div
          className={classNames(
            "opacity-4 bg-brand-default hover:bg-brand-default text-brand dark:border-emphasis absolute hidden rounded-[4px] p-[6px] text-xs font-semibold leading-5 group-hover:flex group-hover:cursor-pointer",
            hoverEventDuration && hoverEventDuration > 15 && "items-start pt-3",
            hoverEventDuration && hoverEventDuration < 15 && "items-center"
          )}
          style={{
            height: `calc(${hoverEventDuration}*var(--one-minute-height) - 2px)`,
            zIndex: 80,
            // @TODO: This used to be 90% as per Sean's work. I think this was needed when
            // multiple events are stacked next to each other. We might need to add this back later.
            width: "calc(100% - 2px)",
          }}>
          <div className="overflow-ellipsis leading-[0]">{timeSlot.format(timeFormat)}</div>
        </div>
      )}
    </div>
  );
}

function CustomCell({ timeSlot, children, topOffsetMinutes }: CellProps & { children: React.ReactNode }) {
  return (
    <div
      className={classNames("bg-default dark:bg-muted flex w-[calc(100%-1px)] items-center justify-center")}
      data-slot={timeSlot.toISOString()}
      style={{
        height: `100%`,
        overflow: "visible",
        top: topOffsetMinutes ? `calc(${topOffsetMinutes}*var(--one-minute-height))` : undefined,
      }}
      onClick={() => {
        console.log("clicked");
      }}>
      <div
        className={classNames(
          "dark:border-emphasis bg-default dark:bg-muted absolute cursor-pointer rounded-[4px] p-[6px] text-xs font-semibold leading-5 dark:text-white"
        )}
        style={{
          height: `100%`,
          zIndex: 80,
          width: "calc(100% - 2px)",
        }}>
        {children}
      </div>
    </div>
  );
}
