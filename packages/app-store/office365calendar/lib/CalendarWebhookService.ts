import type { Prisma, CalendarSubscription } from "@prisma/client";

import type { ICalendarEventRepository } from "@calcom/features/calendar-cache-sql/CalendarEventRepository.interface";
import type { ICalendarSubscriptionRepository } from "@calcom/features/calendar-cache-sql/CalendarSubscriptionRepository.interface";
import type { ICalendarWebhookService } from "@calcom/features/calendar-cache-sql/CalendarWebhookServiceFactory";
import type {
  CredentialForCalendarService,
  CredentialForCalendarServiceWithTenantId,
} from "@calcom/types/Credential";

export class CalendarWebhookService implements ICalendarWebhookService {
  constructor(
    private subscriptionRepo: ICalendarSubscriptionRepository,
    private eventRepo: ICalendarEventRepository
  ) {}

  async processWebhookEvents(
    subscription: CalendarSubscription & {
      selectedCalendar: {
        credential: any | null;
        externalId: string;
        integration: string;
        userId: number;
      };
    },
    credential: CredentialForCalendarService
  ): Promise<void> {
    const { default: Office365CalendarService } = await import("./CalendarService");

    const credentialWithTenantId = credential as CredentialForCalendarServiceWithTenantId;
    const calendarService = new Office365CalendarService(credentialWithTenantId);
    const calendarId = subscription.selectedCalendar.externalId;
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const userEndpoint = await calendarService.getUserEndpoint();
    const eventsUrl =
      calendarId === "primary" || !calendarId
        ? `${userEndpoint}/calendar/calendarView`
        : `${userEndpoint}/calendars/${calendarId}/calendarView`;

    const filter = `?startDateTime=${encodeURIComponent(now.toISOString())}&endDateTime=${encodeURIComponent(
      thirtyDaysFromNow.toISOString()
    )}`;

    const response = await calendarService["fetcher"](`${eventsUrl}${filter}`);
    const responseData = await response.json();

    console.info("Got Office365 events:", responseData.value?.length || 0);

    if (responseData.value) {
      const events = this.parseOffice365Events(responseData.value, subscription.id);

      if (events.length > 0) {
        await this.eventRepo.bulkUpsertEvents(events, subscription.id);
      }
    }
  }

  private parseOffice365Events(
    rawEvents: unknown[],
    subscriptionId: string
  ): Prisma.CalendarEventCreateInput[] {
    return rawEvents.reduce((acc: Prisma.CalendarEventCreateInput[], event: unknown) => {
      const eventObj = event as Record<string, unknown>;
      if (!eventObj.id) return acc;

      const startObj = eventObj.start as Record<string, unknown> | undefined;
      const endObj = eventObj.end as Record<string, unknown> | undefined;
      const start = startObj?.dateTime ? new Date(startObj.dateTime as string) : new Date();
      const end = endObj?.dateTime ? new Date(endObj.dateTime as string) : new Date();
      const isAllDay = !startObj?.dateTime && !!startObj?.date;

      const bodyObj = eventObj.body as Record<string, unknown> | undefined;
      const locationObj = eventObj.location as Record<string, unknown> | undefined;

      acc.push({
        calendarSubscription: { connect: { id: subscriptionId } },
        googleEventId: eventObj.id as string,
        iCalUID: (eventObj.iCalUId as string) || null,
        etag: (eventObj["@odata.etag"] as string) || "",
        sequence: 0,
        summary: (eventObj.subject as string) || null,
        description: (bodyObj?.content as string) || null,
        location: (locationObj?.displayName as string) || null,
        start,
        end,
        isAllDay,
        status: eventObj.isCancelled ? "cancelled" : "confirmed",
        transparency: eventObj.showAs === "free" ? "transparent" : "opaque",
        visibility: "default",
        recurringEventId: (eventObj.seriesMasterId as string) || null,
        originalStartTime: null,
        googleCreatedAt: eventObj.createdDateTime ? new Date(eventObj.createdDateTime as string) : null,
        googleUpdatedAt: eventObj.lastModifiedDateTime
          ? new Date(eventObj.lastModifiedDateTime as string)
          : null,
      });

      return acc;
    }, [] as Prisma.CalendarEventCreateInput[]);
  }
}
