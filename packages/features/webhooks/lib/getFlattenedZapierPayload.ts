import { WebhookTriggerEvents } from "@calcom/prisma/enums";

/**
 * Special flattening for Zapier payloads.
 * Zapier expects a flat structure or it may fail to map fields correctly without a template.
 */
export function getFlattenedZapierPayload(
    triggerEvent: string,
    createdAt: string,
    data: any
): string {
    // If it's a no-show payload, we use a specific structure
    if (
        triggerEvent === WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED ||
        triggerEvent === WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW ||
        triggerEvent === WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW
    ) {
        return JSON.stringify({
            bookingUid: data.bookingUid,
            bookingId: data.bookingId,
            message: data.message,
            attendees: data.attendees,
            noShowHost: data.noShowHost,
            createdAt,
            triggerEvent,
        });
    }

    // Generic flattening for other events
    return JSON.stringify({
        triggerEvent,
        createdAt,
        ...data,
    });
}
