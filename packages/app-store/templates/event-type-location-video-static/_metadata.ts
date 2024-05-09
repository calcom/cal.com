import type { AppMeta } from "@calcom/types/App";

export const metadata = {
  "/*": "Don't modify slug - If required, do it using cli edit command",
  name: "EventType Location Video - Static",
  slug: "event-type-location-video-static",
  type: "event-type-location-video-static_video",
  logo: "icon.svg",
  url: "https://example.com/link",
  variant: "conferencing",
  categories: ["conferencing"],
  publisher: "Cal.com Inc",
  email: "support@cal.com",
  appData: {
    location: {
      type: "integrations:{SLUG}_video",
      label: "{TITLE}",
      linkType: "static",
      organizerInputPlaceholder: "https://video.app/mylink",
      urlRegExp: "^http(s)?:\\/\\/(www\\.)?video.app\\/[a-zA-Z0-9]*",
    },
  },
  description: "It is a template showing how to add a static URL EventType location e.g. Around, Whereby",
  isTemplate: true,
  __createdUsingCli: true,
} as AppMeta;
