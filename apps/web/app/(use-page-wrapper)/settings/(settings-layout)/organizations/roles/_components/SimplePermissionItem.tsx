"use client";

import type { Resource } from "@calcom/features/pbac/domain/types/permission-registry";
import {
  getPermissionsForScope,
  PERMISSION_REGISTRY,
  Scope,
} from "@calcom/features/pbac/domain/types/permission-registry";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { ToggleGroup } from "@calcom/ui/components/form";
import type { PermissionLevel } from "./usePermissions";
import { usePermissions } from "./usePermissions";

interface SimplePermissionItemProps {
  resource: string;
  permissions: string[];
  onChange: (permissions: string[]) => void;
  disabled?: boolean;
  scope?: Scope;
  isPrivate?: boolean;
}

export function SimplePermissionItem({
  resource,
  permissions,
  onChange,
  disabled,
  scope = Scope.Organization,
  isPrivate = false,
}: SimplePermissionItemProps) {
  const { t } = useLocale();
  const { getResourcePermissionLevel, toggleResourcePermissionLevel } = usePermissions(scope);
  const scopedRegistry = getPermissionsForScope(scope, isPrivate);

  const registry = scopedRegistry || PERMISSION_REGISTRY;
  const isAllResources = resource === "*";
  const options = isAllResources
    ? [
        { value: "none", label: t("none") },
        { value: "all", label: t("all") },
      ]
    : [
        { value: "none", label: t("none") },
        { value: "read", label: t("read_only") },
        { value: "all", label: t("all") },
      ];

  return (
    <div className="flex items-center justify-between px-3 py-2">
      <span className="text-default text-sm font-medium leading-none">
        {t(registry[resource as Resource]._resource?.i18nKey || resource)}
      </span>
      <ToggleGroup
        onValueChange={(val) => {
          if (val && !disabled)
            onChange(toggleResourcePermissionLevel(resource, val as PermissionLevel, permissions));
        }}
        value={getResourcePermissionLevel(resource, permissions)}
        options={options}
        disabled={disabled}
      />
    </div>
  );
}
