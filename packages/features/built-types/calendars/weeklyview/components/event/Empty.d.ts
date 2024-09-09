/// <reference types="react" />
import type { CalendarAvailableTimeslots } from "../../types/state";
import type { GridCellToDateProps } from "../../utils";
type EmptyCellProps = GridCellToDateProps & {
    isDisabled?: boolean;
    topOffsetMinutes?: number;
};
export declare function EmptyCell(props: EmptyCellProps): JSX.Element;
type AvailableCellProps = {
    availableSlots: CalendarAvailableTimeslots;
    day: GridCellToDateProps["day"];
    startHour: GridCellToDateProps["startHour"];
};
export declare function AvailableCellsForDay({ availableSlots, day, startHour }: AvailableCellProps): JSX.Element | null;
export {};
//# sourceMappingURL=Empty.d.ts.map