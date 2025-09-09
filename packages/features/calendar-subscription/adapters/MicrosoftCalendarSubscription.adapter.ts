// @typescript-eslint/no-unused-vars
import logger from "@calcom/lib/logger";
import type { SelectedCalendar } from "@calcom/prisma/client";

import type {
  CalendarSubscriptionEvent,
  ICalendarSubscriptionPort,
  CalendarSubscriptionResult,
  CalendarCredential,
  CalendarSubscriptionWebhookContext,
} from "../lib/CalendarSubscriptionPort.interface";

const log = logger.getSubLogger({ prefix: ["MicrosoftCalendarSubscriptionAdapter"] });

export class MicrosoftCalendarSubscriptionAdapter implements ICalendarSubscriptionPort {
  validate(context: CalendarSubscriptionWebhookContext): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  extractChannelId(context: CalendarSubscriptionWebhookContext): Promise<string | null> {
    throw new Error("Method not implemented.");
  }
  async subscribe(
    selectedCalendar: SelectedCalendar,
    credential: CalendarCredential
  ): Promise<CalendarSubscriptionResult> {
    log.debug("Attempt to subscribe to Microsoft Calendar", { externalId: selectedCalendar.externalId });
    throw new Error("Method not implemented.");
  }
  async unsubscribe(selectedCalendar: SelectedCalendar, credential: CalendarCredential): Promise<void> {
    log.debug("Attempt to unsubscribe from Microsoft Calendar", { externalId: selectedCalendar.externalId });
  }
  async fetchEvents(
    selectedCalendar: SelectedCalendar,
    credential: CalendarCredential
  ): Promise<CalendarSubscriptionEvent> {
    log.debug("Attempt to fetch events from Microsoft Calendar", { externalId: selectedCalendar.externalId });
    throw new Error("Method not implemented.");
  }
}
