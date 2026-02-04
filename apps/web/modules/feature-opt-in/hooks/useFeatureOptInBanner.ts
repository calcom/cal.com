"use client";

import type { OptInFeatureConfig } from "@calcom/features/feature-opt-in/config";
import { getOptInFeatureConfig, shouldDisplayFeatureAt } from "@calcom/features/feature-opt-in/config";
import { trpc } from "@calcom/trpc/react";
import posthog from "posthog-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getFeatureOptInTimestamp,
  isFeatureDismissed,
  setFeatureDismissed,
  setFeatureOptedIn,
} from "../lib/feature-opt-in-storage";

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

type FeatureOptInTrackingData = {
  enableFor: "user" | "organization" | "teams";
  teamCount?: number;
  autoOptIn: boolean;
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
  trackFeatureEnabled: (data: FeatureOptInTrackingData) => void;
};

function isFeatureOptedIn(featureId: string): boolean {
  return getFeatureOptInTimestamp(featureId) !== null;
}

function useFeatureOptInBanner(featureId: string): UseFeatureOptInBannerResult {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => isFeatureDismissed(featureId));
  const [isOptedIn, setIsOptedIn] = useState(() => isFeatureOptedIn(featureId));

  const featureConfig = useMemo(() => getOptInFeatureConfig(featureId) ?? null, [featureId]);
  const utils = trpc.useUtils();

  const eligibilityQuery = trpc.viewer.featureOptIn.checkFeatureOptInEligibility.useQuery(
    { featureId },
    {
      enabled: !isDismissed && !isOptedIn && featureConfig !== null,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
    }
  );

  // When the server reports the feature is already enabled, cache it locally
  // to avoid repeated API calls on subsequent page loads
  useEffect(() => {
    if (eligibilityQuery.data?.status === "already_enabled") {
      setFeatureOptedIn(featureId);
      setIsOptedIn(true);
    }
  }, [eligibilityQuery.data?.status, featureId]);

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

  const hasBannerShownBeenTracked = useRef(false);

  const dismiss = useCallback(() => {
    posthog.capture("feature_opt_in_banner_dismissed", {
      feature_slug: featureId,
    });
    setFeatureDismissed(featureId);
    setIsDismissed(true);
  }, [featureId]);

  const markOptedIn = useCallback(() => {
    setFeatureOptedIn(featureId);
    setIsOptedIn(true);
  }, [featureId]);

  const openDialog = useCallback(() => {
    posthog.capture("feature_opt_in_banner_try_it_clicked", {
      feature_slug: featureId,
    });
    setIsDialogOpen(true);
  }, [featureId]);

  const closeDialog = useCallback(() => {
    setIsDialogOpen(false);
  }, []);

  const trackFeatureEnabled = useCallback(
    (data: FeatureOptInTrackingData) => {
      posthog.capture("feature_opt_in_enabled", {
        feature_slug: featureId,
        enable_for: data.enableFor,
        team_count: data.teamCount,
        auto_opt_in: data.autoOptIn,
      });
    },
    [featureId]
  );

  const shouldShow = useMemo(() => {
    if (isDismissed) return false;
    if (isOptedIn) return false;
    if (!featureConfig) return false;
    // Only show banner if the feature is configured to be displayed as a banner
    if (!shouldDisplayFeatureAt(featureConfig, "banner")) return false;
    if (eligibilityQuery.isLoading) return false;
    if (!eligibilityQuery.data) return false;
    return eligibilityQuery.data.status === "can_opt_in";
  }, [isDismissed, isOptedIn, featureConfig, eligibilityQuery.isLoading, eligibilityQuery.data]);

  useEffect(() => {
    if (shouldShow && !hasBannerShownBeenTracked.current) {
      hasBannerShownBeenTracked.current = true;
      posthog.capture("feature_opt_in_banner_shown", {
        feature_slug: featureId,
      });
    }
  }, [shouldShow, featureId]);

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
    trackFeatureEnabled,
  };
}

export { useFeatureOptInBanner };
export type { FeatureOptInMutations, UseFeatureOptInBannerResult };
