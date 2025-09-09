import { useFlagMap } from "@calcom/features/flags/context/provider";
import { isKeyInObject } from "@calcom/lib/isKeyInObject";

import { useNavigationPermissions, type NavigationItemName } from "../context/NavigationPermissionsProvider";
import type { NavigationItemType } from "./NavigationItem";

export function useShouldDisplayNavigationItem(item: NavigationItemType) {
  const flags = useFlagMap();
  const navigationPermissions = useNavigationPermissions();

  if (isKeyInObject(item.name, flags)) return flags[item.name];

  if (item.name in navigationPermissions) {
    return navigationPermissions[item.name as NavigationItemName];
  }

  return true;
}
