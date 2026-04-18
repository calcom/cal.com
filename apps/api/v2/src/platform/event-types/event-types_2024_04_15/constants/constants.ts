export const DEFAULT_EVENT_TYPES = {
  thirtyMinutes: { length: 30, slug: "thirty-minutes", title: "30 Minutes" },
  thirtyMinutesVideo: {
    length: 30,
    slug: "thirty-minutes-video",
    title: "30 Minutes",
    locations: [{ type: "integrations:daily" }],
  },
  sixtyMinutes: { length: 60, slug: "sixty-minutes", title: "60 Minutes" },
  sixtyMinutesVideo: {
    length: 60,
    slug: "sixty-minutes-video",
    title: "60 Minutes",
    locations: [{ type: "integrations:daily" }],
  },
};
