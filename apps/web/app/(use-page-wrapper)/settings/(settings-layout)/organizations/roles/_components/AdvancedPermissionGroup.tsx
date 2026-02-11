"use client";

import { useState } from "react";

import type { Resource } from "@calcom/features/pbac/domain/types/permission-registry";
import {
  Scope,
  CrudAction,
  getPermissionsForScope,
} from "@calcom/features/pbac/domain/types/permission-registry";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { Checkbox, Label } from "@calcom/ui/components/form";
import { Icon } from "@calcom/ui/components/icon";
import { Tooltip } from "@calcom/ui/components/tooltip";

import { usePermissions } from "./usePermissions";

interface AdvancedPermissionGroupProps {
  resource: Resource;
  selectedPermissions: string[];
  onChange: (permissions: string[]) => void;
  disabled?: boolean;
  scope?: Scope;
  isPrivate?: boolean;
}

const INTERNAL_DATAACCESS_KEY = "_resource";

export function AdvancedPermissionGroup({
  resource,
  selectedPermissions,
  onChange,
  disabled,
  scope = Scope.Organization,
  isPrivate = false,
}: AdvancedPermissionGroupProps) {
  const { t } = useLocale();
  const { toggleSinglePermission, toggleResourcePermissionLevel } = usePermissions(scope);
  const scopedRegistry = getPermissionsForScope(scope, isPrivate);
  const resourceConfig = scopedRegistry[resource];
  const [isExpanded, setIsExpanded] = useState(false);

  const isAllResources = resource === "*";

  // Early return if resource is not in the scoped registry (and not the special "*" resource)
  if (!isAllResources && !resourceConfig) {
    return null;
  }

  const allResourcesSelected = selectedPermissions.includes("*.*");

  // Get all possible permissions for this resource
  const allPermissions = isAllResources
    ? ["*.*"]
    : resourceConfig
      ? Object.entries(resourceConfig)
          .filter(([action]) => action !== INTERNAL_DATAACCESS_KEY)
          .map(([action]) => `${resource}.${action}`)
      : [];

  // Check if all permissions for this resource are selected
  const isAllSelected = isAllResources
    ? allResourcesSelected
    : allPermissions.every((p) => selectedPermissions.includes(p));

  const handleToggleAll = (e: React.MouseEvent) => {
    e.stopPropagation(); // Stop event from triggering parent click
    if (!disabled) {
      onChange(toggleResourcePermissionLevel(resource, isAllSelected ? "none" : "all", selectedPermissions));
    }
  };

  const handleCheckedChange = (checked: boolean | string) => {
    if (!disabled) {
      onChange(toggleResourcePermissionLevel(resource, checked ? "all" : "none", selectedPermissions));
    }
  };

  // Helper function to check if read permission is auto-enabled
  const isReadAutoEnabled = (action: string) => {
    if (action === CrudAction.Read) return false;
    if (action === CrudAction.Create || action === CrudAction.Update || action === CrudAction.Delete) {
      return selectedPermissions.includes(`${resource}.${CrudAction.Read}`);
    }
    return false;
  };

  return (
    <div className="bg-cal-muted border-subtle mb-2 rounded-xl border">
      <button
        type="button"
        className="flex cursor-pointer items-center justify-between gap-1.5 p-4"
        onClick={(e) => {
          // Only toggle expansion if clicking on the button itself, not child elements
          if (e.target === e.currentTarget) {
            setIsExpanded(!isExpanded);
          }
        }}>
        <div className="flex items-center gap-1.5" onClick={() => setIsExpanded(!isExpanded)}>
          <Icon
            name="chevron-right"
            className={classNames(
              "h-4 w-4 transition-transform",
              isExpanded && !isAllResources ? "rotate-90" : ""
            )}
          />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={handleCheckedChange}
            onClick={handleToggleAll}
            disabled={disabled}
          />
          <span
            className="text-default cursor-pointer text-sm font-medium leading-none"
            onClick={() => setIsExpanded(!isExpanded)}>
            {t(resourceConfig?._resource?.i18nKey || "")}
          </span>
          <span
            className="text-muted cursor-pointer text-sm font-medium leading-none"
            onClick={() => setIsExpanded(!isExpanded)}>
            {t("all_permissions")}
          </span>
        </div>
      </button>
      {isExpanded && !isAllResources && (
        <div
          className="bg-default border-muted m-1 flex flex-col gap-2.5 rounded-xl border p-3"
          onClick={(e) => e.stopPropagation()} // Stop clicks in the permission list from affecting parent
        >
          {resourceConfig &&
            Object.entries(resourceConfig).map(([action, actionConfig]) => {
              const permission = `${resource}.${action}`;

              if (action === INTERNAL_DATAACCESS_KEY) {
                return null;
              }

              const isChecked = selectedPermissions.includes(permission);
              const isAutoEnabled = isReadAutoEnabled(action);

              return (
                <div key={action} className="flex items-center">
                  <Checkbox
                    id={permission}
                    checked={isChecked}
                    className="mr-2"
                    onCheckedChange={(checked) => {
                      if (!disabled) {
                        onChange(toggleSinglePermission(permission, !!checked, selectedPermissions));
                      }
                    }}
                    onClick={(e) => e.stopPropagation()} // Stop checkbox clicks from affecting parent
                    disabled={disabled}
                  />
                  <div
                    className="flex items-center gap-2"
                    onClick={(e) => e.stopPropagation()} // Stop label clicks from affecting parent
                  >
                    <Label htmlFor={permission} className="mb-0">
                      <span className={classNames(isAutoEnabled && "text-muted-foreground")}>
                        {t(actionConfig?.i18nKey || "")}
                      </span>
                    </Label>
                    <span className="text-sm text-gray-500">
                      {t(
                        actionConfig && "descriptionI18nKey" in actionConfig
                          ? actionConfig.descriptionI18nKey
                          : ""
                      )}
                    </span>
                    {isAutoEnabled && (
                      <Tooltip content={t("read_permission_auto_enabled_tooltip")}>
                        <Icon name="info" className="text-muted-foreground h-3 w-3" />
                      </Tooltip>
                    )}
                  </div>
                </div>
              );
            })}{" "}
        </div>
      )}
    </div>
  );
}
