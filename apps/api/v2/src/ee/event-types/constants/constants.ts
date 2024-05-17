import { IntegrationLocation } from "@calcom/platform-types";

const videoLocations: IntegrationLocation[] = [{ type: "integration", integration: "cal-video" }];

export const DEFAULT_EVENT_TYPES = {
  thirtyMinutes: { lengthInMinutes: 30, slug: "thirty-minutes", title: "30 Minutes" },
  thirtyMinutesVideo: {
    lengthInMinutes: 30,
    slug: "thirty-minutes-video",
    title: "30 Minutes Video",
    locations: videoLocations,
  },
  sixtyMinutes: { lengthInMinutes: 60, slug: "sixty-minutes", title: "60 Minutes" },
  sixtyMinutesVideo: {
    lengthInMinutes: 60,
    slug: "sixty-minutes-video",
    title: "60 Minutes Video",
    locations: videoLocations,
  },
};
