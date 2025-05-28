import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { CalendarSubscription, IntegrationCalendar } from "@calcom/types/Calendar";

type GoogleChannelProps = {
  kind?: string | null;
  id?: string | null;
  resourceId?: string | null;
  resourceUri?: string | null;
  expiration?: string | null;
};

export async function buildGoogleChannelProps({
  calendarId,
  selectedCalendar,
  calendarSubscription,
}: {
  calendarId: string;
  selectedCalendar: IntegrationCalendar | null;
  calendarSubscription: CalendarSubscription | null;
}) {
  let googleChannelProps: GoogleChannelProps = {};
  if (calendarSubscription) {
    googleChannelProps = {
      id: calendarSubscription.providerSubscriptionId,
      kind: calendarSubscription.providerSubscriptionKind,
      resourceId: calendarSubscription.providerResourceId,
      resourceUri: calendarSubscription.providerResourceUri,
      expiration: calendarSubscription.providerExpiration?.toISOString() ?? null,
    };
    logger.info(
      `Calendar ${calendarId} is already being watched via CalendarSubscription. Reusing existing channel.`,
      safeStringify({
        calendarSubscriptionId: calendarSubscription?.id,
      })
    );
  } else if (selectedCalendar) {
    googleChannelProps = {
      kind: selectedCalendar.googleChannelKind,
      id: selectedCalendar.googleChannelId,
      resourceId: selectedCalendar.googleChannelResourceId,
      resourceUri: selectedCalendar.googleChannelResourceUri,
      expiration: selectedCalendar.googleChannelExpiration,
    };
    logger.info(
      `Calendar ${calendarId} is already being watched via otherSelectedCalendar. Reusing existing channel.`,
      safeStringify({
        selectedCalendar: selectedCalendar.id,
      })
    );
  }

  return googleChannelProps;
}
