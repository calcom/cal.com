"use client";

import { useMemo } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui/components/toast";

import type { FeatureState } from "../../flags/config";
import type { NormalizedFeature, UseFeatureOptInResult } from "./types";

/**
 * Hook for managing feature opt-in at the user (personal) level.
 */
export function useUserFeatureOptIn(): UseFeatureOptInResult {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  // Queries
  const featuresQuery = trpc.viewer.featureOptIn.listForUser.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const autoOptInQuery = trpc.viewer.featureOptIn.getUserAutoOptIn.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  // Mutations
  const setStateMutation = trpc.viewer.featureOptIn.setUserState.useMutation({
    onSuccess: () => {
      utils.viewer.featureOptIn.listForUser.invalidate();
      showToast(t("settings_updated_successfully"), "success");
    },
    onError: () => {
      showToast(t("error_updating_settings"), "error");
    },
  });

  const setAutoOptInMutation = trpc.viewer.featureOptIn.setUserAutoOptIn.useMutation({
    onSuccess: () => {
      utils.viewer.featureOptIn.getUserAutoOptIn.invalidate();
      utils.viewer.featureOptIn.listForUser.invalidate();
      showToast(t("settings_updated_successfully"), "success");
    },
    onError: () => {
      showToast(t("error_updating_settings"), "error");
    },
  });

  const features: NormalizedFeature[] = useMemo(
    () =>
      (featuresQuery.data ?? []).map((feature) => ({
        slug: feature.featureId,
        globalEnabled: feature.globalEnabled,
        currentState: feature.userState ?? "inherit",
        effectiveReason: feature.effectiveReason,
      })),
    [featuresQuery.data]
  );

  // Handlers
  const setFeatureState = (slug: string, state: FeatureState) => {
    setStateMutation.mutate({ slug, state });
  };

  const setAutoOptIn = (checked: boolean) => {
    setAutoOptInMutation.mutate({ autoOptIn: checked });
  };

  // User-specific: returns a warning message based on effectiveReason
  const getBlockedWarning = (feature: NormalizedFeature): string | null => {
    if (!feature.effectiveReason) {
      return null;
    }

    switch (feature.effectiveReason) {
      case "feature_org_disabled":
        return t("feature_blocked_by_org_warning");
      case "feature_all_teams_disabled":
        return t("feature_blocked_by_team_warning");
      case "feature_no_explicit_enablement":
        return t("feature_no_explicit_enablement_warning");
      default:
        return null;
    }
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
      enabled: t("feature_on"),
      disabled: t("feature_off"),
      inherit: t("use_default"),
    },

    autoOptInDescription: t("auto_opt_in_experimental_description_personal"),

    getBlockedWarning,
  };
}
