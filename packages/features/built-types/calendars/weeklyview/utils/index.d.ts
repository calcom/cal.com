import dayjs from "@calcom/dayjs";
import type { TimeRange } from "@calcom/types/schedule";
export declare function weekdayDates(weekStart: number | undefined, startDate: Date, length?: number): {
    startDate: Date;
    endDate: Date;
};
export type GridCellToDateProps = {
    day: dayjs.Dayjs;
    gridCellIdx: number;
    totalGridCells: number;
    selectionLength: number;
    startHour: number;
    timezone: string;
};
export declare function gridCellToDateTime({ day, gridCellIdx, totalGridCells, selectionLength, startHour, timezone, }: GridCellToDateProps): dayjs.Dayjs;
export declare function getDaysBetweenDates(dateFrom: Date, dateTo: Date): dayjs.Dayjs[];
export declare function getHoursToDisplay(startHour: number, endHour: number, timezone?: string): dayjs.Dayjs[];
export declare function mergeOverlappingDateRanges(dateRanges: TimeRange[]): TimeRange[];
export declare function calculateHourSizeInPx(gridElementRef: HTMLOListElement | null, startHour: number, endHour: number): number;
//# sourceMappingURL=index.d.ts.map