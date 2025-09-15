import { GoogleCalendarSubscriptionAdapter } from "../adapters/GoogleCalendarSubscription.adapter";
import type {
  CalendarSubscriptionProvider,
  ICalendarSubscriptionPort,
} from "../lib/CalendarSubscriptionPort.interface";
import { Office365CalendarSubscriptionAdapter } from "./Office365CalendarSubscription.adapter";

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
    return this.singletons[provider];
  }
}
