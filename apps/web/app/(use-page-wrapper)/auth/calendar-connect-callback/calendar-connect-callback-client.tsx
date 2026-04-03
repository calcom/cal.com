"use client";

import { useEffect } from "react";

import { notifyCalendarConnectWindowAndClose } from "~/auth/calendar-connect-window";

export function CalendarConnectCallbackClient() {
  useEffect(() => {
    notifyCalendarConnectWindowAndClose();
  }, []);

  return null;
}
