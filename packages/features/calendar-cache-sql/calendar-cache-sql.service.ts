import type { ICalendarEventRepository } from "./calendar-event.repository.interface";
import type { ICalendarSubscriptionRepository } from "./calendar-subscription.repository.interface";

export class CalendarCacheSqlService {
  constructor(
    private subscriptionRepo: ICalendarSubscriptionRepository,
    private eventRepo: ICalendarEventRepository
  ) {}

  async getAvailability(userId: number, integration: string, externalId: string, start: Date, end: Date) {
    const subscription = await this.subscriptionRepo.findByUserAndCalendar(userId, integration, externalId);

    if (!subscription) {
      throw new Error("Calendar subscription not found");
    }

    const events = await this.eventRepo.getEventsForAvailability(subscription.id, start, end);

    return events.map((event) => ({
      start: event.start.toISOString(),
      end: event.end.toISOString(),
      title: event.summary || "Busy",
      source: "calendar-cache-sql",
    }));
  }

  async ensureSubscription(
    userId: number,
    integration: string,
    externalId: string,
    credentialId?: number,
    delegationCredentialId?: string
  ) {
    return await this.subscriptionRepo.upsert({
      user: { connect: { id: userId } },
      integration,
      externalId,
      credential: credentialId ? { connect: { id: credentialId } } : undefined,
      delegationCredential: delegationCredentialId ? { connect: { id: delegationCredentialId } } : undefined,
    });
  }
}
