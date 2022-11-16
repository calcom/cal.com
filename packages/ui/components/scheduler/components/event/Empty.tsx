import { useSchedulerStore } from "../../state/store";
import { gridCellToDateTime, GridCellToDateProps } from "../../utils";

type EmptyCellProps = {
  eventDuration: number;
} & GridCellToDateProps;

export function EmptyCell(props: EmptyCellProps) {
  const { onEmptyCellClick } = useSchedulerStore((state) => ({
    onEmptyCellClick: state.onEmptyCellClick,
  }));
  const cellToDate = gridCellToDateTime({
    day: props.day,
    gridCellIdx: props.gridCellIdx,
    totalGridCells: props.totalGridCells,
    selectionLength: props.selectionLength,
    startHour: props.startHour,
  });
  return (
    <div
      className="group w-full overflow-hidden border hover:border-red-500"
      style={{ maxHeight: "1.75rem" }}
      onClick={() => onEmptyCellClick && onEmptyCellClick(cellToDate.toDate())}>
      {props.eventDuration !== 0 && (
        <div
          className="opacity-4 hidden translate-y-4 rounded-[4px]  border-[1px] border-gray-900 bg-gray-100 py-1  px-[6px]
          text-xs font-semibold leading-5 text-gray-900 hover:bg-gray-200 group-hover:block group-hover:cursor-pointer"
          style={{
            height: `calc(${props.eventDuration}*var(--one-minute-height))`,
            zIndex: 55,
            width: "90%",
          }}>
          <div className="overflow-ellipsis leading-4">{cellToDate.format("HH:mm")}</div>
        </div>
      )}
    </div>
  );
}
