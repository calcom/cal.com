import type { Prisma } from "@prisma/client";
import type { NextApiRequest } from "next";
import type z from "zod";
import type { BookingReference } from "@calcom/prisma/client";
import type { bookingCreateSchemaLegacyPropsForApi } from "@calcom/prisma/zod-utils";
import type { AppsStatus, CalendarEvent } from "@calcom/types/Calendar";
import type { PartialReference } from "@calcom/types/EventManager";
import getBookingDataSchema from "./getBookingDataSchema";
import type { getEventTypeResponse } from "./handleNewBooking/getEventTypesFromDB";
export declare function getCustomInputsResponses(reqBody: {
    responses?: Record<string, object>;
    customInputs?: z.infer<typeof bookingCreateSchemaLegacyPropsForApi>["customInputs"];
}, eventTypeCustomInputs: getEventTypeResponse["customInputs"]): Prisma.JsonObject;
/** Updates the evt object with video call data found from booking references
 *
 * @param bookingReferences
 * @param evt
 *
 * @returns updated evt with video call data
 */
export declare const addVideoCallDataToEvent: (bookingReferences: BookingReference[], evt: CalendarEvent) => CalendarEvent;
export declare const createLoggerWithEventDetails: (eventTypeId: number, reqBodyUser: string | string[] | undefined, eventTypeSlug: string | undefined) => import("tslog").Logger<unknown>;
type BookingDataSchemaGetter = typeof getBookingDataSchema | typeof import("@calcom/features/bookings/lib/getBookingDataSchemaForApi").default;
declare function handler(req: NextApiRequest & {
    userId?: number | undefined;
    platformClientId?: string;
    platformRescheduleUrl?: string;
    platformCancelUrl?: string;
    platformBookingUrl?: string;
    platformBookingLocation?: string;
}, bookingDataSchemaGetter?: BookingDataSchemaGetter): Promise<{
    luckyUsers?: number[] | undefined;
    user: {
        email: null;
        name?: string | null | undefined;
        username?: string | null | undefined;
        timeZone?: string | undefined;
    };
    paymentRequired: boolean;
    payment?: {
        data: Prisma.JsonValue;
        id: number;
        uid: string;
        externalId: string;
        success: boolean;
        currency: string;
        bookingId: number;
        appId: string | null;
        amount: number;
        fee: number;
        refunded: boolean;
        paymentOption: import(".prisma/client").$Enums.PaymentOption | null;
    }[] | undefined;
    references?: {
        type: string;
        id: number;
        uid: string;
        credentialId: number | null;
        bookingId: number | null;
        meetingId: string | null;
        thirdPartyRecurringEventId: string | null;
        meetingPassword: string | null;
        meetingUrl: string | null;
        externalCalendarId: string | null;
        deleted: boolean | null;
    }[] | undefined;
    attendees?: {
        name: string;
        email: string;
        id: number;
        locale: string | null;
        timeZone: string;
        bookingId: number | null;
        noShow: boolean | null;
    }[] | undefined;
    status?: import(".prisma/client").$Enums.BookingStatus | undefined;
    id?: number | undefined;
    description?: string | null | undefined;
    startTime?: Date | undefined;
    endTime?: Date | undefined;
    metadata?: Prisma.JsonValue | undefined;
    uid?: string | undefined;
    idempotencyKey?: string | null | undefined;
    userId?: number | null | undefined;
    userPrimaryEmail?: string | null | undefined;
    eventTypeId?: number | null | undefined;
    title?: string | undefined;
    customInputs?: Prisma.JsonValue | undefined;
    responses?: Prisma.JsonValue | undefined;
    location?: string | null | undefined;
    createdAt?: Date | undefined;
    updatedAt?: Date | null | undefined;
    paid?: boolean | undefined;
    destinationCalendarId?: number | null | undefined;
    cancellationReason?: string | null | undefined;
    rejectionReason?: string | null | undefined;
    dynamicEventSlugRef?: string | null | undefined;
    dynamicGroupSlugRef?: string | null | undefined;
    rescheduled?: boolean | null | undefined;
    fromReschedule?: string | null | undefined;
    recurringEventId?: string | null | undefined;
    smsReminderNumber?: string | null | undefined;
    scheduledJobs?: string[] | undefined;
    isRecorded?: boolean | undefined;
    iCalUID?: string | null | undefined;
    iCalSequence?: number | undefined;
    rating?: number | null | undefined;
    ratingFeedback?: string | null | undefined;
    noShowHost?: boolean | null | undefined;
    cancelledBy?: string | null | undefined;
    rescheduledBy?: string | null | undefined;
    appsStatus?: AppsStatus[] | undefined;
    seatReferenceUid?: string | undefined;
    paymentUid?: string | undefined;
    message?: string | undefined;
    paymentId?: number | undefined;
} | {
    references: PartialReference[];
    seatReferenceUid: string | undefined;
    luckyUsers?: number[] | undefined;
    user: {
        email: null;
        name?: string | null | undefined;
        username?: string | null | undefined;
        timeZone?: string | undefined;
    };
    paymentRequired: boolean;
    payment: {
        data: Prisma.JsonValue;
        id: number;
        uid: string;
        externalId: string;
        success: boolean;
        currency: string;
        bookingId: number;
        appId: string | null;
        amount: number;
        fee: number;
        refunded: boolean;
        paymentOption: import(".prisma/client").$Enums.PaymentOption | null;
    }[];
    attendees: {
        name: string;
        email: string;
        id: number;
        locale: string | null;
        timeZone: string;
        bookingId: number | null;
        noShow: boolean | null;
    }[];
    status: import(".prisma/client").$Enums.BookingStatus;
    id: number;
    description: string | null;
    startTime: Date;
    endTime: Date;
    metadata: Prisma.JsonValue;
    uid: string;
    idempotencyKey: string | null;
    userId: number | null;
    userPrimaryEmail: string | null;
    eventTypeId: number | null;
    title: string;
    customInputs: Prisma.JsonValue;
    responses: Prisma.JsonValue;
    location: string | null;
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
    appsStatus?: AppsStatus[] | undefined;
    paymentUid?: string | undefined;
    paymentId?: number | undefined;
}>;
export default handler;
//# sourceMappingURL=handleNewBooking.d.ts.map