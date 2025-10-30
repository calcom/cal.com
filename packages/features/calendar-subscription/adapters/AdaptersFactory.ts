import { GoogleCalendarSubscriptionAdapter } from "@calcom/features/calendar-subscription/adapters/GoogleCalendarSubscription.adapter";
import { Office365CalendarSubscriptionAdapter } from "@calcom/features/calendar-subscription/adapters/Office365CalendarSubscription.adapter";
import type { ICalendarSubscriptionPort } from "@calcom/features/calendar-subscription/lib/CalendarSubscriptionPort.interface";

export type CalendarSubscriptionProvider = "google_calendar" | "office365_calendar";

export interface AdapterFactory {
  get(provider: CalendarSubscriptionProvider): ICalendarSubscriptionPort;
  getProviders(): CalendarSubscriptionProvider[];
}

/**
 * Default adapter factory
 */
export class DefaultAdapterFactory implements AdapterFactory {
  private singletons = {
    google_calendar: new GoogleCalendarSubscriptionAdapter(),
    office365_calendar: new Office365CalendarSubscriptionAdapter(),
  } as const;

  /**
   * Returns the adapter for the given provider
   *
   * @param provider
   * @returns
   */
  get(provider: CalendarSubscriptionProvider): ICalendarSubscriptionPort {
    const adapter = this.singletons[provider];
    if (!adapter) {
      throw new Error(`No adapter found for provider ${provider}`);
    }
    return adapter;
  }

  /**
   * Returns all available providers
   *
   * @returns
   */
  getProviders(): CalendarSubscriptionProvider[] {
    const providers: CalendarSubscriptionProvider[] = ["google_calendar"];
    return providers;
  }
}
