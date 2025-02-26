import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { CalendarSubscription, IntegrationCalendar } from "@calcom/types/Calendar";

export type GoogleChannelProps = {
  kind?: string | null;
  id?: string | null;
  resourceId?: string | null;
  resourceUri?: string | null;
  expiration?: number | null;
};

/**
 * Builds google Channel props from selectedCalendar or calendarSubscription, giving preference to calendarSubscription.
 */
export async function buildGoogleChannelProps({
  selectedCalendar,
  calendarSubscription,
}: {
  selectedCalendar: IntegrationCalendar | null;
  calendarSubscription: CalendarSubscription | null;
}) {
  let googleChannelProps: GoogleChannelProps | null = null;
  let source: "calendarSubscription" | "selectedCalendar" | null = null;
  if (calendarSubscription) {
    source = "calendarSubscription";
    googleChannelProps = {
      id: calendarSubscription.providerSubscriptionId,
      kind: calendarSubscription.providerSubscriptionKind,
      resourceId: calendarSubscription.providerResourceId,
      resourceUri: calendarSubscription.providerResourceUri,
      expiration: calendarSubscription.providerExpiration?.getTime() ?? null,
    };
    logger.info(
      `Calendar is already being watched via CalendarSubscription. Reusing existing channel.`,
      safeStringify({
        calendarSubscriptionId: calendarSubscription?.id,
      })
    );
  } else if (selectedCalendar) {
    source = "selectedCalendar";
    googleChannelProps = {
      kind: selectedCalendar.googleChannelKind,
      id: selectedCalendar.googleChannelId,
      resourceId: selectedCalendar.googleChannelResourceId,
      resourceUri: selectedCalendar.googleChannelResourceUri,
      expiration: selectedCalendar.googleChannelExpiration
        ? Number(selectedCalendar.googleChannelExpiration)
        : null,
    };
    logger.info(
      `Calendar is already being watched via otherSelectedCalendar. Reusing existing channel.`,
      safeStringify({
        selectedCalendar: selectedCalendar.id,
      })
    );
  }

  return { source, existingGoogleChannelProps: googleChannelProps };
}
