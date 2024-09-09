import type { EventPayloadType } from "@calcom/features/webhooks/lib/sendPayload";
import type { CalendarEvent } from "@calcom/types/Calendar";
export declare const getWebhookPayloadForBooking: ({ booking, evt, }: {
    booking: {
        eventType: {
            title: string;
            description: string | null;
            requiresConfirmation: boolean;
            price: number;
            currency: string;
            length: number;
            id: number;
        } | null;
        id: number;
        eventTypeId: number | null;
        userId: number | null;
    };
    evt: CalendarEvent;
}) => EventPayloadType;
//# sourceMappingURL=getWebhookPayloadForBooking.d.ts.map