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
        timeZone?: string | undefined;
        username?: string | null | undefined;
    };
    paymentRequired: boolean;
    payment?: {
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
    }[] | undefined;
    references?: {
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
    }[] | undefined;
    attendees?: {
        id: number;
        name: string;
        email: string;
        timeZone: string;
        bookingId: number | null;
        locale: string | null;
        noShow: boolean | null;
    }[] | undefined;
    title?: string | undefined;
    metadata?: Prisma.JsonValue | undefined;
    id?: number | undefined;
    location?: string | null | undefined;
    status?: import(".prisma/client").$Enums.BookingStatus | undefined;
    description?: string | null | undefined;
    userId?: number | null | undefined;
    customInputs?: Prisma.JsonValue | undefined;
    smsReminderNumber?: string | null | undefined;
    eventTypeId?: number | null | undefined;
    recurringEventId?: string | null | undefined;
    rescheduledBy?: string | null | undefined;
    uid?: string | undefined;
    cancellationReason?: string | null | undefined;
    cancelledBy?: string | null | undefined;
    iCalUID?: string | null | undefined;
    responses?: Prisma.JsonValue | undefined;
    idempotencyKey?: string | null | undefined;
    userPrimaryEmail?: string | null | undefined;
    startTime?: Date | undefined;
    endTime?: Date | undefined;
    createdAt?: Date | undefined;
    updatedAt?: Date | null | undefined;
    paid?: boolean | undefined;
    destinationCalendarId?: number | null | undefined;
    rejectionReason?: string | null | undefined;
    dynamicEventSlugRef?: string | null | undefined;
    dynamicGroupSlugRef?: string | null | undefined;
    rescheduled?: boolean | null | undefined;
    fromReschedule?: string | null | undefined;
    scheduledJobs?: string[] | undefined;
    isRecorded?: boolean | undefined;
    iCalSequence?: number | undefined;
    rating?: number | null | undefined;
    ratingFeedback?: string | null | undefined;
    noShowHost?: boolean | null | undefined;
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
        timeZone?: string | undefined;
        username?: string | null | undefined;
    };
    paymentRequired: boolean;
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
    attendees: {
        id: number;
        name: string;
        email: string;
        timeZone: string;
        bookingId: number | null;
        locale: string | null;
        noShow: boolean | null;
    }[];
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
    appsStatus?: AppsStatus[] | undefined;
    paymentUid?: string | undefined;
    paymentId?: number | undefined;
}>;
export default handler;
//# sourceMappingURL=handleNewBooking.d.ts.map