import type { App } from "@calcom/types/App";

export const APPS = {
  caldav_calendar: {
    installed: true,
    type: "caldav_calendar",
    title: "CalDav Server",
    name: "CalDav Server",
    imageSrc: "apps/caldav.svg",
    description: "For personal and business calendars",
    variant: "calendar",
  },
} as Record<string, App>;
