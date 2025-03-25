import type { User as UserAuth } from "next-auth";
import { useState } from "react";

import { IS_CALCOM } from "@calcom/lib/constants";
import { useCopy } from "@calcom/lib/hooks/useCopy";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { showToast } from "@calcom/ui/components/toast";

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
  const [isReferalLoading, setIsReferalLoading] = useState(false);
  const { fetchAndCopyToClipboard } = useCopy();

  return [
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
    IS_CALCOM
      ? {
          name: "copy_referral_link",
          href: "",
          onClick: (e: { preventDefault: () => void }) => {
            e.preventDefault();
            setIsReferalLoading(true);
            // Create an artificial delay to show the loading state so it doesn't flicker if this request is fast
            setTimeout(() => {
              fetchAndCopyToClipboard(
                fetch("/api/generate-referral-link", {
                  method: "POST",
                })
                  .then((res) => res.json())
                  .then((res) => res.shortLink),
                {
                  onSuccess: () => showToast(t("link_copied"), "success"),
                  onFailure: () => showToast("Copy to clipboard failed", "error"),
                }
              );
              setIsReferalLoading(false);
            }, 1000);
          },
          icon: "gift",
          isLoading: isReferalLoading,
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
