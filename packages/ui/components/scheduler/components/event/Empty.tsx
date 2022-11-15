import { useSchedulerStore } from "../../state/store";
import { gridCellToDateTime, GridCellToDateProps } from "../../utils";

export function EmptyCell(props: GridCellToDateProps) {
  const { onEmptyCellClick } = useSchedulerStore((state) => ({
    onEmptyCellClick: state.onEmptyCellClick,
  }));

  return (
    <div
      className="h-full w-full hover:bg-red-500"
      onClick={() =>
        onEmptyCellClick &&
        onEmptyCellClick(
          gridCellToDateTime({
            day: props.day,
            gridCellIdx: props.gridCellIdx,
            totalGridCells: props.totalGridCells,
            selectionLength: props.selectionLength,
            startHour: props.startHour,
          }).toDate()
        )
      }
    />
  );
}
