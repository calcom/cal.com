import type { TabMap } from "@calcom/features/eventtypes/lib/types";

export type PlatformTabs = keyof Omit<TabMap, "workflows" | "webhooks" | "instant" | "ai" | "apps">;
