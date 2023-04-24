import type { RouterOutputs } from "@calcom/trpc/react";

export const mockEvent: RouterOutputs["viewer"]["public"]["event"] = {
  id: 1,
  title: "Quick check-in",
  slug: "quick-check-in",
  eventName: "Quick check-in",
  description:
    "Use this event for a quick 15 minute catchup. Visit this long url to test the component https://cal.com/averylongurlwithoutspacesthatshouldntbreaklayout",
  users: [{ name: "Pro Example", username: "pro" }],
  schedulingType: null,
  length: 30,
  locations: [{ type: "integrations:google:meet" }, { type: "integrations:zoom" }],
};
