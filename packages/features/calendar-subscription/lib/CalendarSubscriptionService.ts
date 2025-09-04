import logger from "@calcom/lib/logger";
import type { SelectedCalendarRepository } from "@calcom/lib/server/repository/SelectedCalendarRepository";

import type { ICalendarSubscriptionPort } from "../lib/CalendarSubscriptionPort.interface";

const log = logger.getSubLogger({ prefix: ["CalendarSubscriptionService"] });

export class CalendarSubscriptionService {
  constructor(
    private deps: {
      calendarSubscriptionPort?: ICalendarSubscriptionPort;
      selectedCalendarRepository?: SelectedCalendarRepository;
    }
  ) {}

  /**
   * Subscribes to a calendar
   * @param selectedCalendarId
   * @returns
   */
  async subscribe(selectedCalendarId: string): Promise<void> {
    log.debug("Attempt to subscribe to Google Calendar", { selectedCalendarId });

    const selectedCalendar = await this.deps.selectedCalendarRepository?.findById(selectedCalendarId);
    if (!selectedCalendar) {
      log.debug("Selected calendar not found", { selectedCalendarId });
      return;
    }

    const calendarSubscriptionResult = await this.deps.calendarSubscriptionPort?.subscribe(selectedCalendar);
    await this.deps.selectedCalendarRepository?.updateById(selectedCalendarId, {
      channelId: calendarSubscriptionResult?.resourceId,
      channelResourceId: calendarSubscriptionResult?.resourceId,
      channelResourceUri: calendarSubscriptionResult?.resourceUri,
      channelKind: calendarSubscriptionResult?.provider,
    });
  }

  /**
   * Unsubscribes from a calendar
   * @param selectedCalendarId
   * @returns
   */
  async unsubscribe(selectedCalendarId: string): Promise<void> {
    log.debug("Attempt to unsubscribe from Google Calendar", { selectedCalendarId });
    const selectedCalendar = await this.deps.selectedCalendarRepository?.updateById(selectedCalendarId, {
      syncEnabled: false,
      cacheEnabled: false,
    });

    if (!selectedCalendar) {
      log.debug("Selected calendar not found", { selectedCalendarId });
      return;
    }
    await this.deps.calendarSubscriptionPort?.unsubscribe(selectedCalendar);
  }

  async processWebhook(channelId: string) {
    log.debug("Processing webhook", { channelId });
    const selectedCalendar = await this.deps.selectedCalendarRepository?.findByChannelId(channelId);
    if (!selectedCalendar) {
      log.debug("Selected calendar not found", { channelId });
      return;
    }

    if (!selectedCalendar.credentialId) {
      log.debug("Selected calendar credential not found", { selectedCalendarId: selectedCalendar.id });
      return;
    }

    if (selectedCalendar.syncEnabled || selectedCalendar.cacheEnabled) {
      const calendarSubscriptionEvents = await this.deps.calendarSubscriptionPort?.pullEvents(
        selectedCalendar
      );
    }
  }
}
