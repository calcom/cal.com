/// <reference types="react" />
import type { BookerEvent } from "@calcom/features/bookings/types";
import type { useScheduleForEventReturnType } from "../utils/event";
export declare const LargeCalendar: ({ extraDays, schedule, isLoading, event, }: {
    extraDays: number;
    schedule?: useScheduleForEventReturnType["data"];
    isLoading: boolean;
    event: {
        data?: Pick<BookerEvent, "length"> | null;
    };
}) => JSX.Element;
//# sourceMappingURL=LargeCalendar.d.ts.map