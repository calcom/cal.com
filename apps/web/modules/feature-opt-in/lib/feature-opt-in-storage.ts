"use client";

import { localStorage } from "@calcom/lib/webstorage";
import { z } from "zod";

const DISMISSED_STORAGE_KEY = "feature-opt-in-dismissed";
const OPTED_IN_STORAGE_KEY = "feature-opt-in-enabled";

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

function isFeatureDismissed(featureId: string): boolean {
  return isBooleanFeatureInMap(DISMISSED_STORAGE_KEY, featureId);
}

function setFeatureDismissed(featureId: string): void {
  setBooleanFeatureInMap(DISMISSED_STORAGE_KEY, featureId, true);
}

function setFeatureOptedIn(featureId: string): void {
  setTimestampFeatureInMap(OPTED_IN_STORAGE_KEY, featureId, Date.now());
}

export { getFeatureOptInTimestamp, isFeatureDismissed, setFeatureDismissed, setFeatureOptedIn };
