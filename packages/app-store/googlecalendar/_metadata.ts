import process from "node:process";
import { validJson } from "@calcom/lib/jsonUtils";
import type { AppMeta } from "@calcom/types/App";

export const metadata = {
  name: "Google Calendar",
  description:
    "Google Calendar is a time management and scheduling service developed by Google. Allows users to create and edit events, with options available for type and time. Available to anyone that has a Gmail account on both mobile and web versions.",
  installed: !!(process.env.GOOGLE_API_CREDENTIALS && validJson(process.env.GOOGLE_API_CREDENTIALS)),
  type: "google_calendar",
  title: "Google Calendar",
  variant: "calendar",
  category: "calendar",
  categories: ["calendar"],
  logo: "icon.svg",
  publisher: "Cal.com",
  slug: "google-calendar",
  url: "https://cal.com/",
  email: "help@cal.com",
  dirName: "googlecalendar",
  isOAuth: true,
  delegationCredential: {
    // This is unused at the moment but should be used in future
    // For now, we have hardcoded imports in the codebase that are supported with Google Workspace(i.e. Google Calendar and Google Meet)
    workspacePlatformSlug: "google",
  },
} as AppMeta;

export default metadata;
