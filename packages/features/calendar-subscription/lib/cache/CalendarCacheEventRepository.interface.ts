export interface ICalendarCacheEventRepository {
  upsertByChannelId(data: any): Promise<void>;
  upsertByCredentialId(data: any): Promise<void>;
  upsertBySelectedCalendarId(data: any): Promise<void>;
}
