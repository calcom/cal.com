"use client";

import { useMemo } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui/components/toast";

import type { FeatureState } from "../../flags/config";
import type { NormalizedFeature, UseFeatureOptInResult } from "./types";

type FeatureBlockingState = { orgState?: FeatureState };

/**
 * Hook for managing feature opt-in at the team level.
 */
export function useTeamFeatureOptIn(teamId: number): UseFeatureOptInResult {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  // Queries
  const featuresQuery = trpc.viewer.featureOptIn.listForTeam.useQuery(
    { teamId },
    { refetchOnWindowFocus: false }
  );
  const autoOptInQuery = trpc.viewer.featureOptIn.getTeamAutoOptIn.useQuery(
    { teamId },
    { refetchOnWindowFocus: false }
  );

  // Mutations
  const setStateMutation = trpc.viewer.featureOptIn.setTeamState.useMutation({
    onSuccess: () => {
      utils.viewer.featureOptIn.listForTeam.invalidate({ teamId });
      showToast(t("settings_updated_successfully"), "success");
    },
    onError: () => {
      showToast(t("error_updating_settings"), "error");
    },
  });

  const setAutoOptInMutation = trpc.viewer.featureOptIn.setTeamAutoOptIn.useMutation({
    onSuccess: () => {
      utils.viewer.featureOptIn.getTeamAutoOptIn.invalidate({ teamId });
      utils.viewer.featureOptIn.listForTeam.invalidate({ teamId });
      showToast(t("settings_updated_successfully"), "success");
    },
    onError: () => {
      showToast(t("error_updating_settings"), "error");
    },
  });

  const featureBlockingState = useMemo(() => {
    const map = new Map<string, FeatureBlockingState>();

    (featuresQuery.data ?? []).forEach((feature) => {
      map.set(feature.featureId, {
        orgState: feature.orgState,
      });
    });

    return map;
  }, [featuresQuery.data]);

  // Normalize features to common shape
  const features: NormalizedFeature[] = (featuresQuery.data ?? []).map((feature) => ({
    slug: feature.featureId,
    globalEnabled: feature.globalEnabled,
    currentState: feature.teamState,
  }));

  // Handlers
  const setFeatureState = (slug: string, state: FeatureState) => {
    setStateMutation.mutate({ teamId, slug, state });
  };

  const setAutoOptIn = (checked: boolean) => {
    setAutoOptInMutation.mutate({ teamId, autoOptIn: checked });
  };

  // Team scope: check if blocked by organization
  const getBlockedWarning = (feature: NormalizedFeature): string | null => {
    if (feature.currentState !== "enabled") {
      return null;
    }

    const blockingState = featureBlockingState.get(feature.slug);
    if (!blockingState) {
      return null;
    }

    if (blockingState.orgState === "disabled") {
      return t("feature_blocked_by_org_warning");
    }

    return null;
  };

  return {
    features,
    autoOptIn: autoOptInQuery.data?.autoOptIn ?? false,
    isLoading: featuresQuery.isLoading || autoOptInQuery.isLoading,

    setFeatureState,
    setAutoOptIn,
    isStateMutationPending: setStateMutation.isPending,
    isAutoOptInMutationPending: setAutoOptInMutation.isPending,

    toggleLabels: {
      enabled: t("allow"),
      disabled: t("block"),
      inherit: t("let_users_decide"),
    },

    autoOptInDescription: t("auto_opt_in_experimental_description_team"),

    getBlockedWarning,
  };
}
