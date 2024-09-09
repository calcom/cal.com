import type { Slots } from "./types";
/**
 * Get's slots for a specific date from the schedule cache.
 * @param date Format YYYY-MM-DD
 * @param scheduleCache Instance of useScheduleWithCache
 */
export declare const useSlotsForDate: (date: string | null, slots?: Slots) => {
    time: string;
    attendees?: number | undefined;
    bookingUid?: string | undefined;
    away?: boolean | undefined;
    fromUser?: import("@calcom/core/getUserAvailability").IFromUser | undefined;
    toUser?: import("@calcom/core/getUserAvailability").IToUser | undefined;
    reason?: string | undefined;
    emoji?: string | undefined;
}[];
export declare const useSlotsForAvailableDates: (dates: (string | null)[], slots?: Slots) => {
    slots: {
        time: string;
        attendees?: number | undefined;
        bookingUid?: string | undefined;
        away?: boolean | undefined;
        fromUser?: import("@calcom/core/getUserAvailability").IFromUser | undefined;
        toUser?: import("@calcom/core/getUserAvailability").IToUser | undefined;
        reason?: string | undefined;
        emoji?: string | undefined;
    }[];
    date: string | null;
}[];
//# sourceMappingURL=useSlotsForDate.d.ts.map