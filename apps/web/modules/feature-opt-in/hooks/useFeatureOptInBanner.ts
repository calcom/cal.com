"use client";

import type { OptInFeatureConfig } from "@calcom/features/feature-opt-in/config";
import { getOptInFeatureConfig } from "@calcom/features/feature-opt-in/config";
import { trackFormbricksAction } from "@calcom/features/formbricks/formbricks-client";
import { localStorage } from "@calcom/lib/webstorage";
import { trpc } from "@calcom/trpc/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";

const DISMISSED_STORAGE_KEY = "feature-opt-in-dismissed";
const OPTED_IN_STORAGE_KEY = "feature-opt-in-enabled";
const TRACKED_STORAGE_KEY = "feature-opt-in-tracked";

/** Schema for dismissed and tracked features (boolean values) */
const booleanFeaturesMapSchema: z.ZodSchema<Record<string, boolean>> = z.record(z.string(), z.boolean());

/** Schema for opted-in features (timestamp values) */
const timestampFeaturesMapSchema: z.ZodSchema<Record<string, number>> = z.record(z.string(), z.number());

type BooleanFeaturesMap = z.infer<typeof booleanFeaturesMapSchema>;
type TimestampFeaturesMap = z.infer<typeof timestampFeaturesMapSchema>;

type UserRoleContext = {
  isOrgAdmin: boolean;
  orgId: number | null;
  adminTeamIds: number[];
  adminTeamNames: { id: number; name: string }[];
};

type FeatureOptInMutations = {
  setUserState: (params: { slug: string; state: "enabled" }) => Promise<unknown>;
  setTeamState: (params: { teamId: number; slug: string; state: "enabled" }) => Promise<unknown>;
  setOrganizationState: (params: { slug: string; state: "enabled" }) => Promise<unknown>;
  setUserAutoOptIn: (params: { autoOptIn: boolean }) => Promise<unknown>;
  setTeamAutoOptIn: (params: { teamId: number; autoOptIn: boolean }) => Promise<unknown>;
  setOrganizationAutoOptIn: (params: { autoOptIn: boolean }) => Promise<unknown>;
  invalidateQueries: () => void;
};

type UseFeatureOptInBannerResult = {
  shouldShow: boolean;
  isLoading: boolean;
  featureConfig: OptInFeatureConfig | null;
  canOptIn: boolean;
  blockingReason: string | null;
  userRoleContext: UserRoleContext | null;
  isDialogOpen: boolean;
  openDialog: () => void;
  closeDialog: () => void;
  dismiss: () => void;
  markOptedIn: () => void;
  mutations: FeatureOptInMutations;
};

/** Get boolean features map (for dismissed and tracked storage) */
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

/** Get timestamp features map (for opted-in storage) */
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

/** Set a boolean value in the features map */
function setBooleanFeatureInMap(storageKey: string, featureId: string, value: boolean): void {
  const current = getBooleanFeaturesMap(storageKey);
  current[featureId] = value;
  localStorage.setItem(storageKey, JSON.stringify(current));
}

/** Set a timestamp value in the features map */
function setTimestampFeatureInMap(storageKey: string, featureId: string, timestamp: number): void {
  const current = getTimestampFeaturesMap(storageKey);
  current[featureId] = timestamp;
  localStorage.setItem(storageKey, JSON.stringify(current));
}

/** Check if a feature exists in a boolean features map */
function isBooleanFeatureInMap(storageKey: string, featureId: string): boolean {
  const features = getBooleanFeaturesMap(storageKey);
  return features[featureId] === true;
}

/** Get the opt-in timestamp for a feature, or null if not opted in */
function getFeatureOptInTimestamp(featureId: string): number | null {
  const features = getTimestampFeaturesMap(OPTED_IN_STORAGE_KEY);
  const timestamp = features[featureId];
  if (typeof timestamp === "number") {
    return timestamp;
  }
  return null;
}

/** Check if a feature has been opted into (has a timestamp) */
function isFeatureOptedIn(featureId: string): boolean {
  return getFeatureOptInTimestamp(featureId) !== null;
}

function useFeatureOptInBanner(featureId: string): UseFeatureOptInBannerResult {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => isBooleanFeatureInMap(DISMISSED_STORAGE_KEY, featureId));
  const [isOptedIn, setIsOptedIn] = useState(() => isFeatureOptedIn(featureId));

  const featureConfig = useMemo(() => getOptInFeatureConfig(featureId) ?? null, [featureId]);

  // Track if Formbricks action has been fired to prevent duplicate tracking
  const hasTrackedRef = useRef(false);
  const utils = trpc.useUtils();

  const eligibilityQuery = trpc.viewer.featureOptIn.checkFeatureOptInEligibility.useQuery(
    { featureId },
    {
      enabled: !isDismissed && !isOptedIn && featureConfig !== null,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
    }
  );

  const setUserStateMutation = trpc.viewer.featureOptIn.setUserState.useMutation();
  const setTeamStateMutation = trpc.viewer.featureOptIn.setTeamState.useMutation();
  const setOrganizationStateMutation = trpc.viewer.featureOptIn.setOrganizationState.useMutation();
  const setUserAutoOptInMutation = trpc.viewer.featureOptIn.setUserAutoOptIn.useMutation();
  const setTeamAutoOptInMutation = trpc.viewer.featureOptIn.setTeamAutoOptIn.useMutation();
  const setOrganizationAutoOptInMutation = trpc.viewer.featureOptIn.setOrganizationAutoOptIn.useMutation();

  const mutations: FeatureOptInMutations = useMemo(
    () => ({
      setUserState: (params: { slug: string; state: "enabled" }) => setUserStateMutation.mutateAsync(params),
      setTeamState: (params: { teamId: number; slug: string; state: "enabled" }) =>
        setTeamStateMutation.mutateAsync(params),
      setOrganizationState: (params: { slug: string; state: "enabled" }) =>
        setOrganizationStateMutation.mutateAsync(params),
      setUserAutoOptIn: (params: { autoOptIn: boolean }) => setUserAutoOptInMutation.mutateAsync(params),
      setTeamAutoOptIn: (params: { teamId: number; autoOptIn: boolean }) =>
        setTeamAutoOptInMutation.mutateAsync(params),
      setOrganizationAutoOptIn: (params: { autoOptIn: boolean }) =>
        setOrganizationAutoOptInMutation.mutateAsync(params),
      invalidateQueries: (): void => {
        utils.viewer.featureOptIn.checkFeatureOptInEligibility.invalidate();
        utils.viewer.featureOptIn.listForUser.invalidate();
      },
    }),
    [
      setUserStateMutation,
      setTeamStateMutation,
      setOrganizationStateMutation,
      setUserAutoOptInMutation,
      setTeamAutoOptInMutation,
      setOrganizationAutoOptInMutation,
      utils,
    ]
  );

  const dismiss = useCallback(() => {
    setBooleanFeatureInMap(DISMISSED_STORAGE_KEY, featureId, true);
    setIsDismissed(true);
  }, [featureId]);

  const markOptedIn = useCallback(() => {
    setTimestampFeatureInMap(OPTED_IN_STORAGE_KEY, featureId, Date.now());
    setIsOptedIn(true);
  }, [featureId]);

  // Formbricks delayed tracking effect
  useEffect(() => {
    // Skip if no formbricks config for this feature
    if (!featureConfig?.formbricks) return;

    // Skip if already tracked in this component instance
    if (hasTrackedRef.current) return;

    // Check if already tracked in localStorage
    const alreadyTracked = isBooleanFeatureInMap(TRACKED_STORAGE_KEY, featureId);
    if (alreadyTracked) return;

    // Get the opt-in timestamp
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
      // Delay has already passed, track immediately
      trackAction();
    } else {
      // Set a timeout for the remaining time
      const remainingTime = delayMs - timeSinceOptIn;
      const timer = setTimeout(trackAction, remainingTime);

      return () => clearTimeout(timer);
    }
  }, [featureId, featureConfig]);

  const openDialog = useCallback(() => {
    setIsDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setIsDialogOpen(false);
  }, []);

  const shouldShow = useMemo(() => {
    if (isDismissed) return false;
    if (isOptedIn) return false;
    if (!featureConfig) return false;
    if (eligibilityQuery.isLoading) return false;
    if (!eligibilityQuery.data) return false;
    return eligibilityQuery.data.status === "can_opt_in";
  }, [isDismissed, isOptedIn, featureConfig, eligibilityQuery.isLoading, eligibilityQuery.data]);

  return {
    shouldShow,
    isLoading: eligibilityQuery.isLoading,
    featureConfig,
    canOptIn: eligibilityQuery.data?.canOptIn ?? false,
    blockingReason: eligibilityQuery.data?.blockingReason ?? null,
    userRoleContext: eligibilityQuery.data?.userRoleContext ?? null,
    isDialogOpen,
    openDialog,
    closeDialog,
    dismiss,
    markOptedIn,
    mutations,
  };
}

export { useFeatureOptInBanner };
export type { FeatureOptInMutations, UseFeatureOptInBannerResult };
