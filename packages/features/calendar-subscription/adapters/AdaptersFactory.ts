import { GoogleCalendarSubscriptionAdapter } from "../adapters/GoogleCalendarSubscription.adapter";
import type { ICalendarSubscriptionPort } from "../lib/CalendarSubscriptionPort.interface";
import { Office365CalendarSubscriptionAdapter } from "./Office365CalendarSubscription.adapter";

export type CalendarSubscriptionProvider = "google-calendar" | "office365-calendar";

export interface AdapterFactory {
  get(provider: CalendarSubscriptionProvider): ICalendarSubscriptionPort;
}

/**
 * Default adapter factory
 */
export class DefaultAdapterFactory implements AdapterFactory {
  private singletons = {
    "google-calendar": new GoogleCalendarSubscriptionAdapter(),
    "office365-calendar": new Office365CalendarSubscriptionAdapter(),
  } as const;

  get(provider: CalendarSubscriptionProvider): ICalendarSubscriptionPort {
    const adapter = this.singletons[provider];
    if (!adapter) {
      throw new Error(`No adapter found for provider ${provider}`);
    }
    return adapter;
  }
}
