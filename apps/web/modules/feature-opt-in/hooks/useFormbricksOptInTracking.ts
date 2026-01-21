"use client";

import type { OptInFeatureConfig } from "@calcom/features/feature-opt-in/config";
import { trackFormbricksAction } from "@calcom/features/formbricks/formbricks-client";
import { useEffect, useRef } from "react";

import {
  getFeatureOptInTimestamp,
  isBooleanFeatureInMap,
  setBooleanFeatureInMap,
  TRACKED_STORAGE_KEY,
} from "../lib/feature-opt-in-storage";

/**
 * Hook to handle delayed Formbricks tracking after a user opts into a feature.
 * Tracks the configured action only after the specified delay has passed since opt-in.
 */
export function useFormbricksOptInTracking(featureId: string, featureConfig: OptInFeatureConfig | null): void {
  const hasTrackedRef = useRef(false);

  useEffect(() => {
    if (!featureConfig?.formbricks) return;

    if (hasTrackedRef.current) return;

    const alreadyTracked = isBooleanFeatureInMap(TRACKED_STORAGE_KEY, featureId);
    if (alreadyTracked) return;

    const optInTimestamp = getFeatureOptInTimestamp(featureId);
    if (!optInTimestamp) return;

    const { delayMs, actionName } = featureConfig.formbricks;
    const timeSinceOptIn = Date.now() - optInTimestamp;

    const trackAction = (): void => {
      trackFormbricksAction(actionName);
      setBooleanFeatureInMap(TRACKED_STORAGE_KEY, featureId, true);
      hasTrackedRef.current = true;
    };

    if (timeSinceOptIn >= delayMs) {
      trackAction();
    } else {
      const remainingTime = delayMs - timeSinceOptIn;
      const timer = setTimeout(trackAction, remainingTime);

      return () => clearTimeout(timer);
    }
  }, [featureId, featureConfig]);
}
