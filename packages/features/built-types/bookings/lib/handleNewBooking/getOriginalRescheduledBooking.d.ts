import type { Prisma } from "@prisma/client";
export declare function getOriginalRescheduledBooking(uid: string, seatsEventType?: boolean): Promise<({
    user: {
        id: number;
        name: string | null;
        email: string;
        timeZone: string;
        destinationCalendar: {
            id: number;
            userId: number | null;
            credentialId: number | null;
            eventTypeId: number | null;
            integration: string;
            externalId: string;
            primaryEmail: string | null;
        } | null;
        locale: string | null;
        credentials: {
            invalid: boolean | null;
            type: string;
            id: number;
            key: Prisma.JsonValue;
            user: {
                email: string;
            } | null;
            userId: number | null;
            teamId: number | null;
            appId: string | null;
        }[];
    } | null;
    destinationCalendar: {
        id: number;
        userId: number | null;
        credentialId: number | null;
        eventTypeId: number | null;
        integration: string;
        externalId: string;
        primaryEmail: string | null;
    } | null;
    payment: {
        data: Prisma.JsonValue;
        id: number;
        currency: string;
        bookingId: number;
        success: boolean;
        uid: string;
        appId: string | null;
        externalId: string;
        amount: number;
        fee: number;
        refunded: boolean;
        paymentOption: import(".prisma/client").$Enums.PaymentOption | null;
    }[];
    references: {
        type: string;
        id: number;
        credentialId: number | null;
        bookingId: number | null;
        uid: string;
        thirdPartyRecurringEventId: string | null;
        deleted: boolean | null;
        meetingId: string | null;
        meetingPassword: string | null;
        meetingUrl: string | null;
        externalCalendarId: string | null;
    }[];
    attendees: {
        id: number;
        name: string;
        email: string;
        timeZone: string;
        locale: string | null;
        bookingSeat: {
            data: Prisma.JsonValue;
            id: number;
            bookingId: number;
            referenceUid: string;
            attendeeId: number;
        } | null;
    }[];
    workflowReminders: {
        method: import(".prisma/client").$Enums.WorkflowMethods;
        id: number;
        bookingUid: string | null;
        referenceId: string | null;
        scheduledDate: Date;
        scheduled: boolean;
        workflowStepId: number | null;
        cancelled: boolean | null;
        seatReferenceId: string | null;
        isMandatoryReminder: boolean | null;
        retryCount: number;
    }[];
} & {
    title: string;
    metadata: Prisma.JsonValue;
    id: number;
    location: string | null;
    status: import(".prisma/client").$Enums.BookingStatus;
    description: string | null;
    userId: number | null;
    customInputs: Prisma.JsonValue;
    smsReminderNumber: string | null;
    eventTypeId: number | null;
    recurringEventId: string | null;
    rescheduledBy: string | null;
    uid: string;
    cancellationReason: string | null;
    cancelledBy: string | null;
    iCalUID: string | null;
    responses: Prisma.JsonValue;
    idempotencyKey: string | null;
    userPrimaryEmail: string | null;
    startTime: Date;
    endTime: Date;
    createdAt: Date;
    updatedAt: Date | null;
    paid: boolean;
    destinationCalendarId: number | null;
    rejectionReason: string | null;
    dynamicEventSlugRef: string | null;
    dynamicGroupSlugRef: string | null;
    rescheduled: boolean | null;
    fromReschedule: string | null;
    scheduledJobs: string[];
    isRecorded: boolean;
    iCalSequence: number;
    rating: number | null;
    ratingFeedback: string | null;
    noShowHost: boolean | null;
}) | null>;
export type BookingType = Prisma.PromiseReturnType<typeof getOriginalRescheduledBooking>;
export type OriginalRescheduledBooking = Awaited<ReturnType<typeof getOriginalRescheduledBooking>>;
//# sourceMappingURL=getOriginalRescheduledBooking.d.ts.map