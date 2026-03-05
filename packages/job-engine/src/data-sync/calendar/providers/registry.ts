import type { CalendarProviderAdapter } from "./adapter";
import { GoogleCalendarProviderAdapter } from "./google/googleAdapter";
import { OutlookCalendarProviderAdapter } from "./outlook/outlookAdapter";
import { CalendarProvider, ProviderPermanentError } from "./types";

type AdapterMap = Readonly<Record<CalendarProvider, CalendarProviderAdapter>>;

const createDefaultAdapterMap = (): AdapterMap => {
  const googleAdapter = new GoogleCalendarProviderAdapter();
  const outlookAdapter = new OutlookCalendarProviderAdapter();

  return {
    [CalendarProvider.GOOGLE]: googleAdapter,
    [CalendarProvider.OUTLOOK]: outlookAdapter,
  };
};

export class CalendarProviderRegistry {
  private readonly adapters: AdapterMap;

  constructor(adapters?: Partial<Record<CalendarProvider, CalendarProviderAdapter>>) {
    this.adapters = {
      ...createDefaultAdapterMap(),
      ...(adapters ?? {}),
    };
  }

  getAdapter(provider: CalendarProvider): CalendarProviderAdapter {
    const adapter = this.adapters[provider];
    if (!adapter) {
      throw new ProviderPermanentError({
        provider,
        message: `No adapter registered for provider ${provider}.`,
      });
    }
    return adapter;
  }
}

const defaultRegistry = new CalendarProviderRegistry();

export const getAdapter = (provider: CalendarProvider): CalendarProviderAdapter => {
  return defaultRegistry.getAdapter(provider);
};
