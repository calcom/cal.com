"use client";

import { useOnMount } from "@calcom/lib/hooks/use-on-mount";
import { notifyCalendarConnectWindowAndClose } from "~/auth/calendar-connect-window";

export function CalendarConnectCallbackClient() {
  useOnMount(() => {
    notifyCalendarConnectWindowAndClose();
  });

  return null;
}
