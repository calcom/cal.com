"use client";

import type { OptInFeatureConfig } from "@calcom/features/feature-opt-in/config";
import { getOptInFeatureConfig } from "@calcom/features/feature-opt-in/config";
import { localStorage } from "@calcom/lib/webstorage";
import { trpc } from "@calcom/trpc/react";
import { useCallback, useMemo, useState } from "react";
import { z } from "zod";

const DISMISSED_STORAGE_KEY = "feature-opt-in-dismissed";
const OPTED_IN_STORAGE_KEY = "feature-opt-in-enabled";

const featuresMapSchema = z.record(z.string(), z.boolean());

type FeaturesMap = z.infer<typeof featuresMapSchema>;

type UserRoleContext = {
  isOrgAdmin: boolean;
  orgId: number | null;
  adminTeamIds: number[];
  adminTeamNames: { id: number; name: string }[];
};

export type FeatureOptInMutations = {
  setUserState: (params: { slug: string; state: "enabled" }) => Promise<unknown>;
  setTeamState: (params: { teamId: number; slug: string; state: "enabled" }) => Promise<unknown>;
  setOrganizationState: (params: { slug: string; state: "enabled" }) => Promise<unknown>;
  setUserAutoOptIn: (params: { autoOptIn: boolean }) => Promise<unknown>;
  setTeamAutoOptIn: (params: { teamId: number; autoOptIn: boolean }) => Promise<unknown>;
  setOrganizationAutoOptIn: (params: { autoOptIn: boolean }) => Promise<unknown>;
  invalidateQueries: () => void;
};

export type UseFeatureOptInBannerResult = {
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

function getFeaturesMap(storageKey: string): FeaturesMap {
  const stored = localStorage.getItem(storageKey);
  if (!stored) return {};
  try {
    const parsed = JSON.parse(stored);
    const result = featuresMapSchema.safeParse(parsed);
    if (result.success) {
      return result.data;
    }
    return {};
  } catch {
    return {};
  }
}

function setFeatureInMap(storageKey: string, featureId: string): void {
  const current = getFeaturesMap(storageKey);
  current[featureId] = true;
  localStorage.setItem(storageKey, JSON.stringify(current));
}

function isFeatureInMap(storageKey: string, featureId: string): boolean {
  const features = getFeaturesMap(storageKey);
  return features[featureId] === true;
}

export function useFeatureOptInBanner(featureId: string): UseFeatureOptInBannerResult {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => isFeatureInMap(DISMISSED_STORAGE_KEY, featureId));
  const [isOptedIn, setIsOptedIn] = useState(() => isFeatureInMap(OPTED_IN_STORAGE_KEY, featureId));

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

  const setUserStateMutation = trpc.viewer.featureOptIn.setUserState.useMutation();
  const setTeamStateMutation = trpc.viewer.featureOptIn.setTeamState.useMutation();
  const setOrganizationStateMutation = trpc.viewer.featureOptIn.setOrganizationState.useMutation();
  const setUserAutoOptInMutation = trpc.viewer.featureOptIn.setUserAutoOptIn.useMutation();
  const setTeamAutoOptInMutation = trpc.viewer.featureOptIn.setTeamAutoOptIn.useMutation();
  const setOrganizationAutoOptInMutation = trpc.viewer.featureOptIn.setOrganizationAutoOptIn.useMutation();

  const mutations: FeatureOptInMutations = useMemo(
    () => ({
      setUserState: (params) => setUserStateMutation.mutateAsync(params),
      setTeamState: (params) => setTeamStateMutation.mutateAsync(params),
      setOrganizationState: (params) => setOrganizationStateMutation.mutateAsync(params),
      setUserAutoOptIn: (params) => setUserAutoOptInMutation.mutateAsync(params),
      setTeamAutoOptIn: (params) => setTeamAutoOptInMutation.mutateAsync(params),
      setOrganizationAutoOptIn: (params) => setOrganizationAutoOptInMutation.mutateAsync(params),
      invalidateQueries: () => {
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
    setFeatureInMap(DISMISSED_STORAGE_KEY, featureId);
    setIsDismissed(true);
  }, [featureId]);

  const markOptedIn = useCallback(() => {
    setFeatureInMap(OPTED_IN_STORAGE_KEY, featureId);
    setIsOptedIn(true);
  }, [featureId]);

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
