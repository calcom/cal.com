type EventMap = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  eventTypeSelected: { eventType: any };
  linkFailed: { code: string; msg: string; data: { url: string } };
  linkReady: Record<string, never>;
  __connectInitiated: Record<string, never>;
  __connectCompleted: Record<string, never>;
  bookingSuccessfulV2: {
    uid: string | undefined;
    title: string | undefined;
    startTime: string | undefined;
    endTime: string | undefined;
    eventTypeId: number | null | undefined;
    status: string | undefined;
    paymentRequired: boolean;
    isRecurring: boolean;
    allBookings?: { startTime: string; endTime: string }[];
    videoCallUrl?: string;
  };
  bookingSuccessful: {
    booking: unknown;
    eventType: unknown;
    date: string;
    duration: number | undefined;
    organizer: { name: string; email: string; timeZone: string };
    confirmed: boolean;
  };
  rescheduleBookingSuccessfulV2: {
    uid: string | undefined;
    title: string | undefined;
    startTime: string | undefined;
    endTime: string | undefined;
    eventTypeId: number | null | undefined;
    status: string | undefined;
    paymentRequired: boolean;
    isRecurring: boolean;
    allBookings?: { startTime: string; endTime: string }[];
  };
  rescheduleBookingSuccessful: {
    booking: unknown;
    eventType: unknown;
    date: string;
    duration: number | undefined;
    organizer: { name: string; email: string; timeZone: string };
    confirmed: boolean;
  };
  bookingCancelled: {
    booking: unknown;
    organizer: { name: string; email: string; timeZone?: string };
    eventType: unknown;
  };
  routed: {
    actionType: "customPageMessage" | "externalRedirectUrl" | "eventTypeRedirectUrl";
    actionValue: string;
  };
  navigatedToBooker: Record<string, never>;
  routing_form_change: {
    fields: Record<
      string,
      {
        value: number | string | string[];
        label: string;
        identifier?: string;
      }
    >;
    lastChangedField: {
      id: string;
      identifier: string;
      label: string;
      type: string;
      value: unknown;
    };
  };
  form_submission: {
    submissionId: string;
    formId: string;
    response: Record<
      string,
      {
        value: number | string | string[];
        label: string;
        identifier?: string;
      }
    >;
    chosenRouteId?: string;
    redirectUrl?: string | null;
    formResponseId?: number | null;
    queuedFormResponseId?: number | null;
  };
  set_calendar_event_type: { eventType: string; fieldIdentifier?: string };
  set_field_value: { fieldIdentifier: string; value: number | string | string[] };
  booking_acknowledgement: { submissionId: string; redirect_url?: string };
  "*": Record<string, unknown>;
  __routeChanged: Record<string, never>;
  __windowLoadComplete: Record<string, never>;
  __closeIframe: Record<string, never>;
  __iframeReady: { isPrerendering: boolean };
  __dimensionChanged: { iframeHeight: number; iframeWidth: number; isFirstTime: boolean };
  __scrollByDistance: { distance: number };
};

export type EventRegistry = EventMap;

export type EventEnvelope<T extends keyof EventRegistry> = {
  type: string;
  namespace: string;
  fullType: string;
  data: EventRegistry[T];
};

export type EmbedEvent<T extends keyof EventRegistry> = CustomEvent<EventEnvelope<T>>;

function makeEventName(ns: string, name: string): string {
  return ns ? `CAL:${ns}:${name}` : `CAL::${name}`;
}

export class EventChannel {
  private ns: string;

  constructor(ns: string | null) {
    this.ns = ns ?? "";
  }

  static parseFullType(fullType: string): { ns: string; type: string } | null {
    if (!fullType) return null;
    const parts = fullType.split(":");
    if (parts[0] !== "CAL" || parts.length < 3) return null;
    return { ns: parts[1], type: parts[2] };
  }

  fullName(eventName: string): string {
    return makeEventName(this.ns, eventName);
  }

  publish<T extends keyof EventRegistry>(name: T, data: EventRegistry[T]): void {
    const full = this.fullName(name);
    const detail: EventEnvelope<T> = { type: name, namespace: this.ns, fullType: full, data };
    window.dispatchEvent(new CustomEvent(full, { detail }));
    window.dispatchEvent(new CustomEvent(this.fullName("*"), { detail }));
  }

  listen<T extends keyof EventRegistry>(name: T, handler: (e: CustomEvent<EventEnvelope<T>>) => void): void {
    window.addEventListener(this.fullName(name), handler as EventListener);
  }

  unlisten<T extends keyof EventRegistry>(
    name: T,
    handler: (e: CustomEvent<EventEnvelope<T>>) => void
  ): void {
    window.removeEventListener(this.fullName(name), handler as EventListener);
  }
}

export type { EventChannel as ActionBus, EventChannel as SdkActionManager };
export type { EventRegistry as ActionDataMap };
export type { EventEnvelope as ActionPayload };
