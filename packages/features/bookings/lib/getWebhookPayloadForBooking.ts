import type { EventPayloadType, EventTypeInfo } from "@calcom/features/webhooks/lib/sendPayload";
import type { CalendarEvent } from "@calcom/types/Calendar";

import type { Tracking } from "./handleNewBooking/types";

export const getWebhookPayloadForBooking = ({
  booking,
  evt,
  tracking,
}: {
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
  tracking?: Tracking;
}) => {
  const eventTypeInfo: EventTypeInfo = {
    eventTitle: booking.eventType?.title,
    eventDescription: booking.eventType?.description,
    requiresConfirmation: booking.eventType?.requiresConfirmation || null,
    price: booking.eventType?.price,
    currency: booking.eventType?.currency,
    length: booking.eventType?.length,
  };

  const payload: EventPayloadType = {
    ...evt,
    ...eventTypeInfo,
    bookingId: booking.id,
    ...(tracking?.utm_source && { utmSource: tracking.utm_source }),
    ...(tracking?.utm_medium && { utmMedium: tracking.utm_medium }),
    ...(tracking?.utm_campaign && { utmCampaign: tracking.utm_campaign }),
    ...(tracking?.utm_term && { utmTerm: tracking.utm_term }),
    ...(tracking?.utm_content && { utmContent: tracking.utm_content }),
  };

  return payload;
};
