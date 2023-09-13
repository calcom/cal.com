type Namespace = string;
type CustomEventDetail = Record<string, unknown>;

function _fireEvent(fullName: string, detail: CustomEventDetail) {
  const event = new window.CustomEvent(fullName, {
    detail: detail,
  });

  window.dispatchEvent(event);
}

export type EventDataMap = {
  eventTypeSelected: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    eventType: any;
  };
  linkFailed: {
    code: string;
    msg: string;
    data: {
      url: string;
    };
  };
  linkReady: Record<string, never>;
  bookingSuccessful: {
    // TODO: Shouldn't send the entire booking and eventType objects, we should send specific fields from them.
    booking: unknown;
    eventType: unknown;
    date: string;
    duration: number | undefined;
    organizer: {
      name: string;
      email: string;
      timeZone: string;
    };
    confirmed: boolean;
  };
  "*": Record<string, unknown>;
  __routeChanged: Record<string, never>;
  __windowLoadComplete: Record<string, never>;
  __closeIframe: Record<string, never>;
  __iframeReady: Record<string, never>;
  __dimensionChanged: {
    iframeHeight: number;
    iframeWidth: number;
    isFirstTime: boolean;
  };
};

export type EventData<T extends keyof EventDataMap> = {
  [K in T]: {
    type: string;
    namespace: string;
    fullType: string;
    data: EventDataMap[K];
  };
}[T];

export class SdkActionManager {
  namespace: Namespace;

  static parseAction(fullType: string) {
    if (!fullType) {
      return null;
    }
    //FIXME: Ensure that any action if it has :, it is properly encoded.
    const [cal, calNamespace, type] = fullType.split(":");
    if (cal !== "CAL") {
      return null;
    }
    return {
      ns: calNamespace,
      type,
    };
  }

  getFullActionName(name: string) {
    return this.namespace ? `CAL:${this.namespace}:${name}` : `CAL::${name}`;
  }

  fire<T extends keyof EventDataMap>(name: T, data: EventDataMap[T]) {
    const fullName = this.getFullActionName(name);
    const detail = {
      type: name,
      namespace: this.namespace,
      fullType: fullName,
      data,
    };

    _fireEvent(fullName, detail);

    // Wildcard Event
    _fireEvent(this.getFullActionName("*"), detail);
  }

  on<T extends keyof EventDataMap>(name: T, callback: (arg0: CustomEvent<EventData<T>>) => void) {
    const fullName = this.getFullActionName(name);
    window.addEventListener(fullName, callback as EventListener);
  }

  off<T extends keyof EventDataMap>(name: T, callback: (arg0: CustomEvent<EventData<T>>) => void) {
    const fullName = this.getFullActionName(name);
    window.removeEventListener(fullName, callback as EventListener);
  }

  constructor(ns: string | null) {
    ns = ns || "";
    this.namespace = ns;
  }
}
