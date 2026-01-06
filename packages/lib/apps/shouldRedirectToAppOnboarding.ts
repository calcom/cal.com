import type { AppMeta } from "@calcom/types/App";

export const shouldRedirectToAppOnboarding = (appMetadata: AppMeta) => {
  const hasEventTypes = appMetadata?.extendsFeature === "EventType";
  return hasEventTypes;
};
