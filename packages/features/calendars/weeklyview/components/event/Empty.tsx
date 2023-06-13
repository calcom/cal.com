import { shallow } from "zustand/shallow";

import dayjs from "@calcom/dayjs";
import { useTimePreferences } from "@calcom/features/bookings/lib";
import { classNames } from "@calcom/lib";

import { useCalendarStore } from "../../state/store";
import type { CalendarAvailableTimeslots } from "../../types/state";
import type { GridCellToDateProps } from "../../utils";
import { gridCellToDateTime } from "../../utils";

type EmptyCellProps = GridCellToDateProps & {
  availableSlots?: CalendarAvailableTimeslots;
};

export function EmptyCell(props: EmptyCellProps) {
  const timeFormat = useTimePreferences((state) => state.timeFormat);
  const { onEmptyCellClick, hoverEventDuration } = useCalendarStore(
    (state) => ({
      onEmptyCellClick: state.onEmptyCellClick,
      hoverEventDuration: state.hoverEventDuration,
    }),
    shallow
  );

  const cellToDate = gridCellToDateTime({
    day: props.day,
    gridCellIdx: props.gridCellIdx,
    totalGridCells: props.totalGridCells,
    selectionLength: props.selectionLength,
    startHour: props.startHour,
  });

  // Empty cell won't show it self (be disabled) when
  // availableslots is passed in, and it's curren time is not part of the available slots
  const isDisabled =
    props.availableSlots &&
    !props.availableSlots[dayjs(props.day).format("YYYY-MM-DD")]?.find(
      (slot) => slot.start.getTime() === cellToDate.toDate().getTime()
    );

  return (
    <div
      className={classNames(
        "group flex w-full items-center justify-center",
        isDisabled && "pointer-events-none",
        !isDisabled && "bg-default dark:bg-muted"
      )}
      data-disabled={isDisabled}
      data-day={props.day.toISOString()}
      style={{ height: `calc(${hoverEventDuration}*var(--one-minute-height))`, overflow: "visible" }}
      onClick={() => onEmptyCellClick && onEmptyCellClick(cellToDate.toDate())}>
      {!isDisabled && hoverEventDuration !== 0 && (
        <div
          className="opacity-4 bg-subtle hover:bg-emphasis  text-emphasis dark:border-emphasis absolute hidden
          rounded-[4px]
          border-[1px] border-gray-900 py-1 px-[6px] text-xs font-semibold leading-5 group-hover:block group-hover:cursor-pointer"
          style={{
            height: `calc(${hoverEventDuration}*var(--one-minute-height) - 2px)`,
            zIndex: 49,
            // @TODO: This used to be 90% as per Sean's work. I think this was needed when
            // multiple events are stacked next to each other. We might need to add this back later.
            width: "calc(100% - 2px)",
          }}>
          <div className=" overflow-ellipsis leading-4">{cellToDate.format(timeFormat)}</div>
        </div>
      )}
    </div>
  );
}
