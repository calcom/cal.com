import type { User as UserAuth } from "next-auth";

import { IS_DUB_REFERRALS_ENABLED } from "@calcom/lib/constants";
import { useHasActiveTeamPlanAsOwner } from "@calcom/lib/hooks/useHasPaidPlan";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { showToast } from "@calcom/ui/components/toast";

import { type NavigationItemType } from "./navigation/NavigationItem";

type BottomNavItemsProps = {
  publicPageUrl: string; // can be empty/relative; we’ll normalize
  isAdmin: boolean;
  user: UserAuth | null | undefined;
};

// Resolve any href (absolute or relative) to an absolute URL for SSR safety.
// Returns undefined if it can’t be resolved.
const withBase = (u?: string): string | undefined => {
  if (!u) return undefined;
  const base = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_WEBAPP_URL || "http://localhost:3000";
  try {
    return new URL(u, base).toString();
  } catch {
    return undefined;
  }
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

  const safePublicHref = withBase(publicPageUrl);
  const safeReferHref = withBase("/refer");
  const safeImpersonationHref = withBase("/settings/admin/impersonation");
  const safeSettingsHref = withBase(
    user?.org ? "/settings/organizations/profile" : "/settings/my-account/profile"
  );

  return [
    // Action-only (no href)
    isTrial
      ? {
          name: "skip_trial",
          isLoading: skipTeamTrialsMutation.isPending,
          icon: "clock",
          onClick: (e: { preventDefault: () => void }) => {
            e.preventDefault();
            skipTeamTrialsMutation.mutate({});
          },
        }
      : null,

    // External public page link, only if we have a resolvable absolute URL
    safePublicHref
      ? {
          name: "view_public_page",
          href: safePublicHref,
          icon: "external-link",
          target: "_blank",
        }
      : null,

    // Action-only (no href)
    {
      name: "copy_public_page_link",
      icon: "copy",
      onClick: (e: { preventDefault: () => void }) => {
        e.preventDefault();
        // Prefer resolved; fall back to raw input if clipboard is allowed
        const toCopy = safePublicHref ?? publicPageUrl ?? "";
        if (typeof navigator !== "undefined" && navigator.clipboard?.writeText && toCopy) {
          navigator.clipboard.writeText(toCopy);
          showToast(t("link_copied"), "success");
        } else {
          showToast(t("something_went_wrong"), "error");
        }
      },
    },

    IS_DUB_REFERRALS_ENABLED
      ? safeReferHref && {
          name: "referral_text",
          href: safeReferHref,
          icon: "gift",
        }
      : null,

    isAdmin
      ? safeImpersonationHref && {
          name: "impersonation",
          href: safeImpersonationHref,
          icon: "lock",
        }
      : null,

    safeSettingsHref && {
      name: "settings",
      href: safeSettingsHref,
      icon: "settings",
    },
  ].filter(Boolean) as NavigationItemType[];
}
