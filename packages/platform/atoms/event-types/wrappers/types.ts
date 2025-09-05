import type {
  EventTypePlatformWrapperRef as EventSettingsFromRef,
  TabMap,
} from "@calcom/features/eventtypes/lib/types";

export type { EventSettingsFromRef };

export type PlatformTabs = keyof Omit<TabMap, "workflows" | "webhooks" | "instant" | "ai" | "apps">;
