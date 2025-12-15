"use client";

import { useMemo } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui/components/toast";

import type { FeatureState } from "../../flags/config";
import type { NormalizedFeature, UseFeatureOptInResult } from "./types";

type FeatureBlockingState = { orgState?: FeatureState; teamStates?: FeatureState[] };

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
        teamStates: feature.teamStates,
      });
    });

    return map;
  }, [featuresQuery.data]);

  const features: NormalizedFeature[] = useMemo(
    () =>
      (featuresQuery.data ?? []).map((feature) => ({
        slug: feature.featureId,
        globalEnabled: feature.globalEnabled,
        currentState: feature.userState ?? "inherit",
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

  // User-specific: check if blocked by org or team
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

    const hasTeamBlock = blockingState.teamStates?.some((state) => state === "disabled");
    if (hasTeamBlock) {
      return t("feature_blocked_by_team_warning");
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
      enabled: t("on"),
      disabled: t("off"),
      inherit: t("use_default"),
    },

    autoOptInDescription: t("auto_opt_in_experimental_description_personal"),

    getBlockedWarning,
  };
}
