/// <reference types="react" />
import type { BookerEvent } from "@calcom/features/bookings/types";
import type { useScheduleForEventReturnType } from "../utils/event";
type AvailableTimeSlotsProps = {
    extraDays?: number;
    limitHeight?: boolean;
    schedule?: useScheduleForEventReturnType["data"];
    isLoading: boolean;
    seatsPerTimeSlot?: number | null;
    showAvailableSeatsCount?: boolean | null;
    event: {
        data?: Pick<BookerEvent, "length"> | null;
    };
    customClassNames?: {
        availableTimeSlotsContainer?: string;
        availableTimeSlotsTitle?: string;
        availableTimeSlotsHeaderContainer?: string;
        availableTimeSlotsTimeFormatToggle?: string;
        availableTimes?: string;
    };
};
/**
 * Renders available time slots for a given date.
 * It will extract the date from the booker store.
 * Next to that you can also pass in the `extraDays` prop, this
 * will also fetch the next `extraDays` days and show multiple days
 * in columns next to each other.
 */
export declare const AvailableTimeSlots: ({ extraDays, limitHeight, seatsPerTimeSlot, showAvailableSeatsCount, schedule, isLoading, event, customClassNames, }: AvailableTimeSlotsProps) => JSX.Element;
export {};
//# sourceMappingURL=AvailableTimeSlots.d.ts.map