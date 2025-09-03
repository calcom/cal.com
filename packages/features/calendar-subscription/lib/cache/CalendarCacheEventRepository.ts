import type { ICalendarCacheEventRepository } from "calendar-subscription/lib/cache/CalendarCacheEventRepository.interface";

export class CalendarCacheEventRepository implements ICalendarCacheEventRepository {
  upsertByChannelId(data: any): Promise<void> {
    throw new Error("Method not implemented.");
  }
  upsertByCredentialId(data: any): Promise<void> {
    throw new Error("Method not implemented.");
  }
  upsertBySelectedCalendarId(data: any): Promise<void> {
    throw new Error("Method not implemented.");
  }
}
