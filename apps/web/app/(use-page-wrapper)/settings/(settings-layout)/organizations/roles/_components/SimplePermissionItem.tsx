"use client";

import type { Resource } from "@calcom/features/pbac/domain/types/permission-registry";
import { Scope } from "@calcom/features/pbac/domain/types/permission-registry";
import { useLocale } from "@calcom/i18n/useLocale";
import { ToggleGroup } from "@calcom/ui/components/form";

import { getResourceLabel } from "./permission-labels";
import type { PermissionLevel } from "./usePermissions";
import { usePermissions } from "./usePermissions";

interface SimplePermissionItemProps {
  resource: string;
  permissions: string[];
  onChange: (permissions: string[]) => void;
  disabled?: boolean;
  scope?: Scope;
}

export function SimplePermissionItem({
  resource,
  permissions,
  onChange,
  disabled,
  scope = Scope.Organization,
}: SimplePermissionItemProps) {
  const { t } = useLocale(["settings_organizations_roles", "common"]);
  const { getResourcePermissionLevel, toggleResourcePermissionLevel } = usePermissions(scope);

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
        {t(getResourceLabel(resource as Resource) || resource)}
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
