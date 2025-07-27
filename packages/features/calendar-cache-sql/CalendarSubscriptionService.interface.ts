import type { CredentialForCalendarService } from "@calcom/types/Credential";

export type GoogleChannelProps = {
  kind?: string | null;
  id?: string | null;
  resourceId?: string | null;
  resourceUri?: string | null;
  expiration?: string | null;
};

export interface ICalendarSubscriptionService {
  watchCalendar(
    calendarId: string,
    credential: CredentialForCalendarService
  ): Promise<GoogleChannelProps | undefined>;
  unwatchCalendar(
    calendarId: string,
    credential: CredentialForCalendarService,
    channelId: string,
    resourceId: string
  ): Promise<void>;
}
