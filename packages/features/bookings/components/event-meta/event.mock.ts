import type { BookerEvent } from "bookings/types";

export const mockEvent: BookerEvent = {
  id: 1,
  title: "Quick check-in",
  slug: "quick-check-in",
  eventName: "Quick check-in",
  description:
    "Use this event for a quick 15 minute catchup. Visit this long url to test the component https://cal.com/averylongurlwithoutspacesthatshouldntbreaklayout",
  users: [
    { name: "Pro example", username: "pro", weekStart: "Sunday", avatarUrl: "", profile: null },
    { name: "Team example", username: "team", weekStart: "Sunday", avatarUrl: "", profile: null },
  ],
  schedulingType: null,
  length: 30,
  locations: [{ type: "integrations:google:meet" }, { type: "integrations:zoom" }],
};
