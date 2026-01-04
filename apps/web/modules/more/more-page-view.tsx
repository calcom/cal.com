"use client";

import { useSession } from "next-auth/react";

import { getBookerBaseUrlSync } from "@calcom/features/ee/organizations/lib/getBookerBaseUrlSync";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { UserPermissionRole } from "@calcom/prisma/enums";

import Shell from "~/shell/Shell";
import { MobileNavigationMoreItems } from "~/shell/navigation/Navigation";
import { MobileNavigationMoreItem } from "~/shell/navigation/NavigationItem";
import { useBottomNavItems } from "~/shell/useBottomNavItems";

export default function MorePage() {
  const { t } = useLocale();
  const { data: session } = useSession();
  const user = session?.user;
  const isAdmin = user?.role === UserPermissionRole.ADMIN;
  const publicPageUrl = `${getBookerBaseUrlSync(user?.org?.slug ?? null)}/${
    user?.orgAwareUsername ?? user?.username
  }`;

  const bottomNavItems = useBottomNavItems({
    publicPageUrl,
    isAdmin,
    user,
  });

  const mobileBottomNavItems = bottomNavItems.filter(
    (item) => item.name !== "settings"
  );

  return (
    <Shell>
      <div className="max-w-(--breakpoint-lg)">
        <MobileNavigationMoreItems />
        {mobileBottomNavItems.length > 0 && (
          <ul className="border-subtle mt-4 rounded-md border">
            {mobileBottomNavItems.map((item) => (
              <MobileNavigationMoreItem key={item.name} item={item} />
            ))}
          </ul>
        )}
        <p className="text-subtle mt-6 text-xs leading-tight md:hidden">
          {t("more_page_footer")}
        </p>
      </div>
    </Shell>
  );
}
