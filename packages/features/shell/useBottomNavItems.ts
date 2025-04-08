import type { User as UserAuth } from "next-auth";

import { IS_DUB_REFERRALS_ENABLED } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { showToast } from "@calcom/ui/components/toast";

import { type NavigationItemType } from "./navigation/NavigationItem";

interface CalComUserAuth extends UserAuth {
  trialEndsAt?: Date | null;
}

type BottomNavItemsProps = {
  publicPageUrl: string;
  isAdmin: boolean;
  user: CalComUserAuth | null | undefined;
};

export function useBottomNavItems({
  publicPageUrl,
  isAdmin,
  user,
}: BottomNavItemsProps): NavigationItemType[] {
  const { t } = useLocale();

  return [
    user?.trialEndsAt
      ? {
          name: "skip_trial",
          href: "#",
          icon: "x", // Using 'x' icon to represent skipping/canceling
          onClick: async (e: { preventDefault: () => void }) => {
            e.preventDefault();
            try {
              const response = await fetch("/api/stripe/skip-trial", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
              });

              if (response.ok) {
                showToast(t("trial_skipped_successfully"), "success");
                window.location.reload();
              } else {
                showToast(t("error_skipping_trial"), "error");
              }
            } catch (error) {
              console.error("Error skipping trial:", error);
              showToast(t("error_skipping_trial"), "error");
            }
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
