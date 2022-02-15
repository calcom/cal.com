import { validJson } from "../../jsonUtils";
import { App } from "../interfaces/App";

export const APPS = {
  google_calendar: {
    installed: !!(process.env.GOOGLE_API_CREDENTIALS && validJson(process.env.GOOGLE_API_CREDENTIALS)),
    type: "google_calendar",
    title: "Google Calendar",
    name: "Google Calendar",
    description: "For personal and business calendars",
    imageSrc: "apps/google-calendar.svg",
    variant: "calendar",
  },
  office365_calendar: {
    installed: !!(process.env.MS_GRAPH_CLIENT_ID && process.env.MS_GRAPH_CLIENT_SECRET),
    type: "office365_calendar",
    title: "Office 365 / Outlook.com Calendar",
    name: "Office 365 Calendar",
    description: "For personal and business calendars",
    imageSrc: "apps/outlook.svg",
    variant: "calendar",
  },
  caldav_calendar: {
    installed: true,
    type: "caldav_calendar",
    title: "CalDav Server",
    name: "CalDav Server",
    imageSrc: "apps/caldav.svg",
    description: "For personal and business calendars",
    variant: "calendar",
  },
  apple_calendar: {
    installed: true,
    type: "apple_calendar",
    title: "Apple Calendar",
    name: "Apple Calendar",
    description: "For personal and business calendars",
    imageSrc: "apps/apple-calendar.svg",
    variant: "calendar",
  },
} as Record<string, App>;
