/// <reference types="react" />
import type { RouterOutputs } from "@calcom/trpc/react";
import type { TimeRange, WorkingHours } from "@calcom/types/schedule";
declare const DateOverrideList: ({ workingHours, excludedDates, travelSchedules, userTimeFormat, hour12, replace, fields, weekStart, }: {
    replace: any;
    fields: {
        ranges: TimeRange[];
        id: string;
    }[];
    workingHours: WorkingHours[];
    excludedDates?: string[] | undefined;
    userTimeFormat: number | null;
    hour12: boolean;
    travelSchedules?: {
        id: number;
        timeZone: string;
        endDate: Date | null;
        startDate: Date;
    }[] | undefined;
    weekStart?: 0 | 2 | 1 | 3 | 4 | 5 | 6 | undefined;
}) => JSX.Element;
export default DateOverrideList;
//# sourceMappingURL=DateOverrideList.d.ts.map