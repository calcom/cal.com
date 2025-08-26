import logger from "@calcom/lib/logger";
import type { SelectedCalendarRepository } from "@calcom/lib/server/repository/SelectedCalendarRepository";

import { GoogleCalendarSyncAdapter } from "./adapters/google.adapter";

export class CalendarSyncService {
  private providers = {
    google: new GoogleCalendarSyncAdapter(),
  } as const;
  constructor(
    private deps: {
      selectedCalendarRepository?: SelectedCalendarRepository;
      calendarSubscriptionRepository?: CalendarSubscriptionRepository;
    }
  ) {}

  async handleSync(provider: "google") {
    logger.info(`Syncing ${provider} calendar...`);
    const events = await this.providers[provider].pullEvents();
  }
}
