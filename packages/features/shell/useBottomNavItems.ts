import type { User as UserAuth } from "next-auth";

import { IS_DUB_REFERRALS_ENABLED } from "@calcom/lib/constants";
import { useHasActiveTeamPlanAsOwner } from "@calcom/lib/hooks/useHasPaidPlan";

import { type NavigationItemType } from "./navigation/NavigationItem";

type BottomNavItemsProps = {
  publicPageUrl: string;
  isAdmin: boolean;
  user: UserAuth | null | undefined;
  onNavClick?: (navItemName: string) => void;
};

export function useBottomNavItems({
  publicPageUrl,
  isAdmin,
  user,
  onNavClick,
}: BottomNavItemsProps): NavigationItemType[] {
  const { isTrial } = useHasActiveTeamPlanAsOwner();

  return [
    // Render above to prevent layout shift as much as possible
    isTrial
      ? {
          name: "skip_trial",
          href: "",
          icon: "clock",
          onClick: (e: { preventDefault: () => void }) => {
            e.preventDefault();
            onNavClick?.("skip_trial");
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
      },
      icon: "copy",
    },
    IS_DUB_REFERRALS_ENABLED
      ? {
          name: "referral_text",
          href: "/refer",
          icon: "gift",
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
