import type { Payment, Webhook } from "@prisma/client";
import type { TGetTranscriptAccessLink } from "@calcom/app-store/dailyvideo/zod";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";
export type EventTypeInfo = {
    eventTitle?: string | null;
    eventDescription?: string | null;
    requiresConfirmation?: boolean | null;
    price?: number | null;
    currency?: string | null;
    length?: number | null;
};
export type UTCOffset = {
    utcOffset?: number | null;
};
export type WithUTCOffsetType<T> = T & {
    user?: Person & UTCOffset;
} & {
    organizer?: Person & UTCOffset;
} & {
    attendees?: (Person & UTCOffset)[];
};
export type BookingNoShowUpdatedPayload = {
    message: string;
    bookingUid: string;
    bookingId?: number;
    attendees: {
        email: string;
        noShow: boolean;
    }[];
};
export type TranscriptionGeneratedPayload = {
    downloadLinks?: {
        transcription: TGetTranscriptAccessLink["transcription"];
        recording: string;
    };
};
export type OOOEntryPayloadType = {
    oooEntry: {
        id: number;
        start: string;
        end: string;
        createdAt: string;
        updatedAt: string;
        notes: string | null;
        reason: {
            emoji?: string;
            reason?: string;
        };
        reasonId: number;
        user: {
            id: number;
            name: string | null;
            username: string | null;
            timeZone: string;
            email: string;
        };
        toUser: {
            id: number;
            name?: string | null;
            username?: string | null;
            timeZone?: string;
            email?: string;
        } | null;
        uuid: string;
    };
};
export type EventPayloadType = CalendarEvent & TranscriptionGeneratedPayload & EventTypeInfo & {
    metadata?: {
        [key: string]: string | number | boolean | null;
    };
    bookingId?: number;
    status?: string;
    smsReminderNumber?: string;
    rescheduleId?: number;
    rescheduleUid?: string;
    rescheduleStartTime?: string;
    rescheduleEndTime?: string;
    downloadLink?: string;
    paymentId?: number;
    rescheduledBy?: string;
    cancelledBy?: string;
    paymentData?: Payment;
};
export type WebhookPayloadType = EventPayloadType | OOOEntryPayloadType | BookingNoShowUpdatedPayload;
export declare function jsonParse(jsonString: string): any;
export declare function isOOOEntryPayload(data: WebhookPayloadType): data is OOOEntryPayloadType;
export declare function isNoShowPayload(data: WebhookPayloadType): data is BookingNoShowUpdatedPayload;
export declare function isEventPayload(data: WebhookPayloadType): data is EventPayloadType;
declare const sendPayload: (secretKey: string | null, triggerEvent: string, createdAt: string, webhook: Pick<Webhook, "subscriberUrl" | "appId" | "payloadTemplate">, data: WebhookPayloadType) => Promise<{
    message?: string | undefined;
    ok: boolean;
    status: number;
}>;
export declare const sendGenericWebhookPayload: ({ secretKey, triggerEvent, createdAt, webhook, data, rootData, }: {
    secretKey: string | null;
    triggerEvent: string;
    createdAt: string;
    webhook: Pick<Webhook, "subscriberUrl" | "appId" | "payloadTemplate">;
    data: Record<string, unknown>;
    rootData?: Record<string, unknown> | undefined;
}) => Promise<{
    message?: string | undefined;
    ok: boolean;
    status: number;
}>;
export declare const createWebhookSignature: (params: {
    secret?: string | null;
    body: string;
}) => string;
export default sendPayload;
//# sourceMappingURL=sendPayload.d.ts.map