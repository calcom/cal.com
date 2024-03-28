import type { AppMeta } from "@calcom/types/App";

export const shouldRedirectToAppOnboarding = (appMetadata: AppMeta) => {
  // const appMetadata = appStoreMetadata[dirName as keyof typeof appStoreMetadata];
  const hasEventTypes = appMetadata?.extendsFeature == "EventType";
  const isOAuth = appMetadata?.isOAuth;
  const isCalendar = appMetadata?.category === "calendar";
  return !isCalendar && (hasEventTypes || isOAuth);
};
