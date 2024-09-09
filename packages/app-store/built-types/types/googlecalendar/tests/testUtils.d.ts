import type { Page } from "@playwright/test";
import type { Prisma } from "@calcom/prisma/client";
/**
 * Creates the booking on Cal.com and makes the GCal call to fetch the event.
 * Ends on the booking success page
 * @param page
 *
 * @returns the raw GCal event GET response and the booking reference
 */
export declare const createBookingAndFetchGCalEvent: (page: Page, qaGCalCredential: Prisma.CredentialGetPayload<{
    select: {
        id: true;
    };
}> | null, qaUsername: string) => Promise<{
    gCalEvent: import("googleapis").calendar_v3.Schema$Event;
    gCalReference: {
        booking: {
            status: import(".prisma/client").$Enums.BookingStatus;
            id: number;
            description: string | null;
            title: string;
            metadata: Prisma.JsonValue;
            location: string | null;
            uid: string;
            idempotencyKey: string | null;
            userId: number | null;
            userPrimaryEmail: string | null;
            eventTypeId: number | null;
            customInputs: Prisma.JsonValue;
            responses: Prisma.JsonValue;
            startTime: Date;
            endTime: Date;
            createdAt: Date;
            updatedAt: Date | null;
            paid: boolean;
            destinationCalendarId: number | null;
            cancellationReason: string | null;
            rejectionReason: string | null;
            dynamicEventSlugRef: string | null;
            dynamicGroupSlugRef: string | null;
            rescheduled: boolean | null;
            fromReschedule: string | null;
            recurringEventId: string | null;
            smsReminderNumber: string | null;
            scheduledJobs: string[];
            isRecorded: boolean;
            iCalUID: string | null;
            iCalSequence: number;
            rating: number | null;
            ratingFeedback: string | null;
            noShowHost: boolean | null;
            cancelledBy: string | null;
            rescheduledBy: string | null;
        } | null;
        uid: string;
    };
    booking: {
        title: string;
        user: {
            email: string;
        } | null;
        attendees: {
            email: string;
        }[];
        uid: string;
        startTime: Date;
        endTime: Date;
    };
    authedCalendar: import("googleapis").calendar_v3.Calendar;
}>;
export declare const deleteBookingAndEvent: (authedCalendar: any, bookingUid: string, gCalReferenceUid?: string) => Promise<void>;
export declare function assertValueExists(value: unknown, variableName?: string): asserts value;
//# sourceMappingURL=testUtils.d.ts.map