"use client";

import type { OptInFeatureConfig } from "@calcom/features/feature-opt-in/config";
import { trackFormbricksAction } from "@calcom/features/formbricks/formbricks-client";
import { localStorage } from "@calcom/lib/webstorage";
import { useEffect, useRef } from "react";
import { z } from "zod";

const OPTED_IN_STORAGE_KEY = "feature-opt-in-enabled";
const TRACKED_STORAGE_KEY = "feature-opt-in-tracked";

const booleanFeaturesMapSchema: z.ZodSchema<Record<string, boolean>> = z.record(z.string(), z.boolean());
const timestampFeaturesMapSchema: z.ZodSchema<Record<string, number>> = z.record(z.string(), z.number());

type BooleanFeaturesMap = z.infer<typeof booleanFeaturesMapSchema>;
type TimestampFeaturesMap = z.infer<typeof timestampFeaturesMapSchema>;

function getBooleanFeaturesMap(storageKey: string): BooleanFeaturesMap {
  const stored = localStorage.getItem(storageKey);
  if (!stored) return {};
  try {
    const parsed = JSON.parse(stored);
    const result = booleanFeaturesMapSchema.safeParse(parsed);
    if (result.success) {
      return result.data;
    }
    return {};
  } catch {
    return {};
  }
}

function getTimestampFeaturesMap(storageKey: string): TimestampFeaturesMap {
  const stored = localStorage.getItem(storageKey);
  if (!stored) return {};
  try {
    const parsed = JSON.parse(stored);
    const result = timestampFeaturesMapSchema.safeParse(parsed);
    if (result.success) {
      return result.data;
    }
    return {};
  } catch {
    return {};
  }
}

function setBooleanFeatureInMap(storageKey: string, featureId: string, value: boolean): void {
  const current = getBooleanFeaturesMap(storageKey);
  current[featureId] = value;
  localStorage.setItem(storageKey, JSON.stringify(current));
}

function setTimestampFeatureInMap(storageKey: string, featureId: string, timestamp: number): void {
  const current = getTimestampFeaturesMap(storageKey);
  current[featureId] = timestamp;
  localStorage.setItem(storageKey, JSON.stringify(current));
}

function isBooleanFeatureInMap(storageKey: string, featureId: string): boolean {
  const features = getBooleanFeaturesMap(storageKey);
  return features[featureId] === true;
}

function getFeatureOptInTimestamp(featureId: string): number | null {
  const features = getTimestampFeaturesMap(OPTED_IN_STORAGE_KEY);
  const timestamp = features[featureId];
  if (typeof timestamp === "number") {
    return timestamp;
  }
  return null;
}

/**
 * Hook to handle delayed Formbricks tracking after a user opts into a feature.
 * Tracks the configured action only after the specified delay has passed since opt-in.
 */
function useFormbricksOptInTracking(featureId: string, featureConfig: OptInFeatureConfig | null): void {
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

export { useFormbricksOptInTracking };
export {
  getBooleanFeaturesMap,
  getTimestampFeaturesMap,
  setBooleanFeatureInMap,
  setTimestampFeatureInMap,
  isBooleanFeatureInMap,
  getFeatureOptInTimestamp,
  OPTED_IN_STORAGE_KEY,
  TRACKED_STORAGE_KEY,
};
