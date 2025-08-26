import type { CalendarSubscription } from "@prisma/client";

import type { ICalendarSubscriptionRepository } from "./CalendarSubscriptionRepository.interface";

export class CalendarSubscriptionRepository implements ICalendarSubscriptionRepository {
  async findByChannelId(channelId: string): Promise<CalendarSubscription | null> {
    throw new Error("Method not implemented.");
  }
  async findBySelectedCalendarId(selectedCalendarId: string): Promise<CalendarSubscription | null> {
    throw new Error("Method not implemented.");
  }
  async findByCredentialId(credentialId: string): Promise<CalendarSubscription | null> {
    throw new Error("Method not implemented.");
  }
  async upsertByChannelId(data: CalendarSubscription): Promise<CalendarSubscription> {
    throw new Error("Method not implemented.");
  }
  async upsertByCredentialId(data: CalendarSubscription): Promise<CalendarSubscription> {
    throw new Error("Method not implemented.");
  }
  async upsertBySelectedCalendarId(data: CalendarSubscription): Promise<CalendarSubscription> {
    throw new Error("Method not implemented.");
  }
}
