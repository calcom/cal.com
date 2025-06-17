import { useState } from "react";

import type { Resource } from "@calcom/features/pbac/domain/types/permission-registry";
import { PERMISSION_REGISTRY } from "@calcom/features/pbac/domain/types/permission-registry";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { Icon } from "@calcom/ui/components/icon";
import { Checkbox, Label } from "@calcom/ui/form";

import { usePermissions } from "./usePermissions";

interface AdvancedPermissionGroupProps {
  resource: Resource;
  selectedPermissions: string[];
  onChange: (permissions: string[]) => void;
}

const INTERNAL_DATAACCESS_KEY = "_resource";

export function AdvancedPermissionGroup({
  resource,
  selectedPermissions,
  onChange,
}: AdvancedPermissionGroupProps) {
  const { t } = useLocale();
  const { toggleSinglePermission, toggleResourcePermissionLevel } = usePermissions();
  const resourceConfig = PERMISSION_REGISTRY[resource];
  const [isExpanded, setIsExpanded] = useState(false);

  const isAllResources = resource === "*";
  const allResourcesSelected = selectedPermissions.includes("*.*");

  // Get all possible permissions for this resource
  const allPermissions = isAllResources
    ? ["*.*"]
    : Object.entries(resourceConfig)
        .filter(([action]) => action !== INTERNAL_DATAACCESS_KEY)
        .map(([action]) => `${resource}.${action}`);

  // Check if all permissions for this resource are selected
  const isAllSelected = isAllResources
    ? allResourcesSelected
    : allPermissions.every((p) => selectedPermissions.includes(p));

  const handleToggleAll = (e: React.MouseEvent) => {
    e.stopPropagation(); // Stop event from triggering parent click
    onChange(toggleResourcePermissionLevel(resource, isAllSelected ? "none" : "all", selectedPermissions));
  };

  return (
    <div className="bg-muted border-subtle mb-2 rounded-xl border">
      <button
        type="button"
        className="flex cursor-pointer items-center justify-between gap-1.5 p-4"
        onClick={() => setIsExpanded(!isExpanded)}>
        <Icon
          name="chevron-down"
          className={classNames("h-4 w-4 transition-transform", isExpanded ? "rotate-180" : "")}
        />
        <div className="flex items-center gap-2">
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={() => handleToggleAll}
            onClick={handleToggleAll}
          />
          <span className="text-default text-sm font-medium leading-none">
            {t(resourceConfig._resource?.i18nKey || "")}
          </span>
          <span className="text-muted text-sm font-medium leading-none">{t("all_permissions")}</span>
        </div>
      </button>
      {isExpanded && !isAllResources && (
        <div
          className="bg-default border-muted m-1 flex flex-col gap-2.5 rounded-xl border p-3"
          onClick={(e) => e.stopPropagation()} // Stop clicks in the permission list from affecting parent
        >
          {Object.entries(resourceConfig).map(([action, actionConfig]) => {
            const permission = `${resource}.${action}`;

            if (action === INTERNAL_DATAACCESS_KEY) {
              return null;
            }

            return (
              <div key={action} className="flex items-center">
                <Checkbox
                  id={permission}
                  checked={selectedPermissions.includes(permission)}
                  className="mr-2"
                  onCheckedChange={(checked) => {
                    onChange(toggleSinglePermission(permission, !!checked, selectedPermissions));
                  }}
                  onClick={(e) => e.stopPropagation()} // Stop checkbox clicks from affecting parent
                />
                <div
                  className="flex items-center gap-2"
                  onClick={(e) => e.stopPropagation()} // Stop label clicks from affecting parent
                >
                  <Label htmlFor={permission} className="mb-0">
                    <span>{t(actionConfig?.i18nKey || "")}</span>
                  </Label>
                  <span className="text-sm text-gray-500">
                    {t(
                      actionConfig && "descriptionI18nKey" in actionConfig
                        ? actionConfig.descriptionI18nKey
                        : ""
                    )}
                  </span>
                </div>
              </div>
            );
          })}{" "}
        </div>
      )}
    </div>
  );
}
