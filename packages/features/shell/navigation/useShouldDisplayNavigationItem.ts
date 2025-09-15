import { useFlagMap } from "@calcom/features/flags/context/provider";
import { isKeyInObject } from "@calcom/lib/isKeyInObject";

import {
  useNavigationPermissions,
  type NavigationItemName,
} from "../permissions/NavigationPermissionsProvider";
import type { NavigationItemType } from "./NavigationItem";

export function useShouldDisplayNavigationItem(item: NavigationItemType) {
  const flags = useFlagMap();
  const { permissions: navigationPermissions, isLoading } = useNavigationPermissions();

  if (isKeyInObject(item.name, flags) && flags[item.name] === false) {
    return false;
  }

  if (isLoading) {
    return true;
  }

  if (item.name in navigationPermissions) {
    return navigationPermissions[item.name as NavigationItemName];
  }

  return true;
}
