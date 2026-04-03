import { useEffect } from "react";

import { WEBAPP_URL } from "@calcom/lib/constants";

export const CALENDAR_CONNECT_WINDOW_SUCCESS = "window:calendar-connect:success";

export const CALENDAR_CONNECT_CALLBACK_URL = `${WEBAPP_URL}/auth/calendar-connect-callback`;

export function isOpenedByCalendarConnectWindow(): boolean {
  return !!window.opener && new URLSearchParams(window.location.search).get("calendarConnectPopup") === "true";
}

export function notifyCalendarConnectWindowAndClose(): void {
  if (!window.opener) return;
  window.opener.postMessage({ type: CALENDAR_CONNECT_WINDOW_SUCCESS }, window.location.origin);
  window.close();
}

export function useCalendarConnectWindowListener(isEmbed: boolean, onSuccess: () => void) {
  useEffect(() => {
    if (!isEmbed) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === CALENDAR_CONNECT_WINDOW_SUCCESS) {
        onSuccess();
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [isEmbed, onSuccess]);
}
