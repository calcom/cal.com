import type { User as UserAuth } from "next-auth";
import posthog from "posthog-js";

import { IS_DUB_REFERRALS_ENABLED } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui/components/toast";
import { useHasActiveTeamPlanAsOwner } from "@calcom/web/modules/billing/hooks/useHasPaidPlan";

import { type NavigationItemType } from "./navigation/NavigationItem";

type BottomNavItemsProps = {
  publicPageUrl: string;
  isAdmin: boolean;
  user: UserAuth | null | undefined;
};

export function useBottomNavItems({
  publicPageUrl,
  isAdmin,
  user,
}: BottomNavItemsProps): NavigationItemType[] {
  const { t } = useLocale();
  const { isTrial } = useHasActiveTeamPlanAsOwner();
  const utils = trpc.useUtils();

  const skipTeamTrialsMutation = trpc.viewer.teams.skipTeamTrials.useMutation({
    onSuccess: () => {
      utils.viewer.teams.hasActiveTeamPlan.invalidate();
      showToast(t("team_trials_skipped_successfully"), "success");
    },
    onError: () => {
      showToast(t("something_went_wrong"), "error");
    },
  });

  return [
    // Render above to prevent layout shift as much as possible
    isTrial
      ? {
          name: "skip_trial",
          href: "",
          isLoading: skipTeamTrialsMutation.isPending,
          icon: "clock",
          onClick: (e: { preventDefault: () => void }) => {
            e.preventDefault();
            skipTeamTrialsMutation.mutate({});
          },
        }
      : null,
    {
      name: "view_public_page",
      href: publicPageUrl,
      icon: "external-link",
      target: "__blank",
    },
    {
      name: "copy_public_page_link",
      href: "",
      onClick: (e: { preventDefault: () => void }) => {
        e.preventDefault();
        navigator.clipboard.writeText(publicPageUrl);
        showToast(t("link_copied"), "success");
      },
      icon: "copy",
    },
    IS_DUB_REFERRALS_ENABLED
      ? {
          name: "referral_text",
          href: "/refer",
          icon: "gift",
          onClick: () => {
            posthog.capture("refer_and_earn_clicked");
          },
        }
      : null,

    isAdmin
      ? {
          name: "impersonation",
          href: "/settings/admin/impersonation",
          icon: "lock",
        }
      : null,
    {
      name: "settings",
      href: user?.org ? `/settings/organizations/profile` : "/settings/my-account/profile",
      icon: "settings",
    },
  ].filter(Boolean) as NavigationItemType[];
}
