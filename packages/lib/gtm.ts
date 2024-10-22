declare const window: Window & { dataLayer: Record<string, unknown>[] };

export const pushGTMEvent = (event: string, data?: Record<string, unknown>) => {
  window.dataLayer?.push({
    event,
    ...data,
  });
};
