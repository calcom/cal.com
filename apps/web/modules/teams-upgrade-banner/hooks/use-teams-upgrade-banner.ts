"use client";

import { IS_SELF_HOSTED } from "@calcom/lib/constants";
import { trpc } from "@calcom/trpc/react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import posthog from "posthog-js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  isTeamsUpgradeBannerDismissed,
  markTeamsUpgradeBannerFirstShown,
  setTeamsUpgradeBannerDismissed,
} from "../lib/teams-upgrade-banner-storage";

type UseTeamsUpgradeBannerResult = {
  shouldShow: boolean;
  isLoading: boolean;
  isDialogOpen: boolean;
  openDialog: () => void;
  openDialogFromImage: () => void;
  closeDialog: () => void;
  dismiss: () => void;
};

const SHOW_DELAY_MS = 30_000;

export function useTeamsUpgradeBanner(): UseTeamsUpgradeBannerResult {
  const [isDismissed, setIsDismissed] = useState(() => isTeamsUpgradeBannerDismissed());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDelayComplete, setIsDelayComplete] = useState(false);
  const hasBannerShownBeenTracked = useRef(false);
  const pathname = usePathname();
  const { status: sessionStatus } = useSession();
  const isAuthenticated = sessionStatus === "authenticated";

  // Hide on the bookings page where the bookings-v3 opt-in banner is shown instead
  const isOnBookingsPage = pathname?.startsWith("/bookings") ?? false;

  // Delay banner appearance so it doesn't compete with the timezone nudge dialog
  useEffect(() => {
    const timer = setTimeout(() => setIsDelayComplete(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const { data: teamPlanData, isLoading: isTeamPlanLoading } = trpc.viewer.teams.hasTeamPlan.useQuery(
    undefined,
    {
      enabled: isAuthenticated && !isDismissed,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
    }
  );

  const isE2E = process.env.NEXT_PUBLIC_IS_E2E === "1";

  const shouldShow = useMemo(() => {
    if (IS_SELF_HOSTED) return false;
    if (isE2E) return false;
    if (!isDelayComplete) return false;
    if (isDismissed) return false;
    if (isOnBookingsPage) return false;
    if (isTeamPlanLoading) return false;
    if (!teamPlanData) return false;
    // Only show for users without a team plan (individual/free users)
    if (teamPlanData.hasTeamPlan) return false;
    return true;
  }, [isE2E, isDelayComplete, isDismissed, isOnBookingsPage, isTeamPlanLoading, teamPlanData]);

  useEffect(() => {
    if (shouldShow && !hasBannerShownBeenTracked.current) {
      hasBannerShownBeenTracked.current = true;
      markTeamsUpgradeBannerFirstShown();
      posthog.capture("teams_upgrade_banner_shown");
    }
  }, [shouldShow]);

  const dismiss = useCallback(() => {
    posthog.capture("teams_upgrade_banner_dismissed");
    setTeamsUpgradeBannerDismissed();
    setIsDismissed(true);
  }, []);

  const openDialog = useCallback(() => {
    posthog.capture("teams_upgrade_banner_cta_clicked");
    setIsDialogOpen(true);
  }, []);

  const openDialogFromImage = useCallback(() => {
    posthog.capture("teams_upgrade_banner_image_clicked");
    setIsDialogOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setIsDialogOpen(false);
  }, []);

  return {
    shouldShow,
    isLoading: isTeamPlanLoading,
    isDialogOpen,
    openDialog,
    openDialogFromImage,
    closeDialog,
    dismiss,
  };
}
