import shallow from "zustand/shallow";

import { useCalendarStore } from "../../state/store";
import { gridCellToDateTime, GridCellToDateProps } from "../../utils";

export function EmptyCell(props: GridCellToDateProps) {
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

  return (
    <div
      className="group w-full"
      style={{ height: "1.75rem", overflow: "visible" }}
      onClick={() => onEmptyCellClick && onEmptyCellClick(cellToDate.toDate())}>
      {hoverEventDuration !== 0 && (
        <div
          className="opacity-4 absolute inset-x-1  hidden rounded-[4px] border-[1px] border-gray-900  bg-gray-100
          py-1
          px-[6px] text-xs font-semibold leading-5 text-gray-900 hover:bg-gray-200 group-hover:block group-hover:cursor-pointer"
          style={{
            height: `calc(${hoverEventDuration}*var(--one-minute-height))`,
            zIndex: 49,
            width: "90%",
          }}>
          <div className="overflow-ellipsis leading-4">{cellToDate.format("HH:mm")}</div>
        </div>
      )}
    </div>
  );
}
