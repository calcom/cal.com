import type { BookerEvent } from "@calcom/features/bookings/types";

export const mockEvent: BookerEvent = {
  id: 1,
  title: "Quick check-in",
  slug: "quick-check-in",
  description:
    "Use this event for a quick 15 minute catchup. Visit this long url to test the component https://cal.com/averylongurlwithoutspacesthatshouldntbreaklayout",
  schedulingType: null,
  length: 30,
  locations: [{ type: "integrations:google:meet" }, { type: "integrations:zoom" }],
};
