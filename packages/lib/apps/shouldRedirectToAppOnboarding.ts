import type { AppMeta } from "@calcom/app-store-types";

export const shouldRedirectToAppOnboarding = (appMetadata: AppMeta) => {
  const hasEventTypes = appMetadata?.extendsFeature == "EventType";
  return hasEventTypes;
};
