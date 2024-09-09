import type { BookerEvent, BookingCreateBody, RecurringBookingCreateBody } from "../../types";
export type BookingOptions = {
    values: Record<string, unknown>;
    event: Pick<BookerEvent, "id" | "length" | "slug" | "schedulingType" | "recurringEvent">;
    date: string;
    duration: number | undefined | null;
    timeZone: string;
    language: string;
    rescheduleUid: string | undefined;
    rescheduledBy: string | undefined;
    username: string;
    metadata?: Record<string, string>;
    bookingUid?: string;
    seatReferenceUid?: string;
    hashedLink?: string | null;
    teamMemberEmail?: string | null;
    orgSlug?: string;
};
export declare const mapBookingToMutationInput: ({ values, event, date, duration, timeZone, language, rescheduleUid, rescheduledBy, username, metadata, bookingUid, seatReferenceUid, hashedLink, teamMemberEmail, orgSlug, }: BookingOptions) => BookingCreateBody;
export declare const mapRecurringBookingToMutationInput: (booking: BookingOptions, recurringCount: number) => RecurringBookingCreateBody[];
//# sourceMappingURL=booking-to-mutation-input-mapper.d.ts.map