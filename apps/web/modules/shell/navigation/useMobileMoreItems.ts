import { getBookerBaseUrlSync } from "@calcom/features/ee/organizations/lib/getBookerBaseUrlSync";
import { UserPermissionRole } from "@calcom/prisma/enums";
import { useSession } from "next-auth/react";
import { useBottomNavItems } from "../useBottomNavItems";
import type { NavigationItemType } from "./NavigationItem";

export function useMobileMoreItems(): NavigationItemType[] {
  const { data: session } = useSession();
  const user = session?.user;
  const isAdmin = user?.role === UserPermissionRole.ADMIN;
  const publicPageUrl = `${getBookerBaseUrlSync(user?.org?.slug ?? null)}/${user?.orgAwareUsername ?? user?.username}`;

  const bottomNavItems = useBottomNavItems({
    publicPageUrl,
    isAdmin,
    user,
  });

  const filteredBottomNavItems = bottomNavItems.filter(
    (item: NavigationItemType) => item.name !== "settings"
  );
  return filteredBottomNavItems;
}
