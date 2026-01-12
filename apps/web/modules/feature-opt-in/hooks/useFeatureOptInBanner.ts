"use client";

import { useCallback, useMemo, useState } from "react";
import { z } from "zod";

import type { OptInFeatureConfig } from "@calcom/features/feature-opt-in/config";
import { getOptInFeatureConfig } from "@calcom/features/feature-opt-in/config";
import { localStorage } from "@calcom/lib/webstorage";
import { trpc } from "@calcom/trpc/react";

const DISMISSED_STORAGE_KEY = "feature-opt-in-dismissed";

const dismissedFeaturesSchema = z.record(z.string(), z.boolean());

type DismissedFeatures = z.infer<typeof dismissedFeaturesSchema>;

type UserRoleContext = {
  isOrgAdmin: boolean;
  orgId: number | null;
  adminTeamIds: number[];
  adminTeamNames: { id: number; name: string }[];
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
};

function getDismissedFeatures(): DismissedFeatures {
  const stored = localStorage.getItem(DISMISSED_STORAGE_KEY);
  if (!stored) return {};
  try {
    const parsed = JSON.parse(stored);
    const result = dismissedFeaturesSchema.safeParse(parsed);
    if (result.success) {
      return result.data;
    }
    return {};
  } catch {
    return {};
  }
}

function setDismissedFeature(featureId: string): void {
  const current = getDismissedFeatures();
  current[featureId] = true;
  localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(current));
}

function isFeatureDismissed(featureId: string): boolean {
  const dismissed = getDismissedFeatures();
  return dismissed[featureId] === true;
}

export function useFeatureOptInBanner(featureId: string): UseFeatureOptInBannerResult {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => isFeatureDismissed(featureId));

  const featureConfig = useMemo(() => getOptInFeatureConfig(featureId) ?? null, [featureId]);

  const eligibilityQuery = trpc.viewer.featureOptIn.checkFeatureOptInEligibility.useQuery(
    { featureId },
    {
      enabled: !isDismissed && featureConfig !== null,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
    }
  );

  const dismiss = useCallback(() => {
    setDismissedFeature(featureId);
    setIsDismissed(true);
  }, [featureId]);

  const openDialog = useCallback(() => {
    setIsDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setIsDialogOpen(false);
  }, []);

  const shouldShow = useMemo(() => {
    if (isDismissed) return false;
    if (!featureConfig) return false;
    if (eligibilityQuery.isLoading) return false;
    if (!eligibilityQuery.data) return false;
    return eligibilityQuery.data.status === "can_opt_in";
  }, [isDismissed, featureConfig, eligibilityQuery.isLoading, eligibilityQuery.data]);

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
  };
}
