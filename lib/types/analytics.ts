declare global {
  interface Window {
    dataLayer: {
      push: ({ ...props }) => void;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rg4js: (key: string, value: any) => void;
    heap: {
      appid: string;
      config: unknown;
      loaded: boolean;
      identify: () => void;
      addUserProperties: (params: { [name: string]: string }) => void;
      identity?: string;
      track: (eventName: string, eventProperties?: unknown) => void;
    };
  }
}

export type HeapIdentify = (email: string) => void;
