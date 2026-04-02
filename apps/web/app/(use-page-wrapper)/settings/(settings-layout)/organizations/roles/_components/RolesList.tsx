"use client";

import type { Scope } from "@calcom/features/pbac/domain/types/permission-registry";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import classNames from "@calcom/ui/classNames";
import { Badge } from "@calcom/ui/components/badge";
import { Button } from "@calcom/ui/components/button";
import {
  Dropdown,
  DropdownItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@calcom/ui/components/dropdown";
import { useRoleStates } from "../hooks/useRoleQueryStates";
import { DeleteRoleModal } from "./DeleteRoleModal";
import { RoleSheet } from "./RoleSheet";

type Role = {
  id: string;
  name: string;
  description?: string;
  teamId?: number;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
  type: "SYSTEM" | "CUSTOM";
  permissions: {
    id: string;
    resource: string;
    action: string;
  }[];
};

type Roles = Role[];

type Permissions = {
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canRead: boolean;
};

interface RolesListProps {
  roles: Roles;
  permissions: Permissions;
  initialSelectedRole?: Role;
  initialSheetOpen?: boolean;
  teamId: number;
  scope?: Scope;
  isPrivate?: boolean;
}

export function RolesList({
  roles,
  permissions,
  initialSelectedRole,
  initialSheetOpen,
  teamId,
  scope,
  isPrivate,
}: RolesListProps) {
  const { t } = useLocale();
  const { isOpen, setIsOpen, selectedRoleId, setSelectedRoleId, handleSheetOpenChange } = useRoleStates(
    initialSheetOpen,
    initialSelectedRole?.id
  );

  const selectedRole = roles.find((role) => role.id === selectedRoleId);

  return (
    <>
      <div className="mt-4">
        <div className="bg-cal-muted border-muted flex flex-col rounded-xl border p-px">
          {/* Roles list header */}
          <div className="px-5 py-4">
            <h2 className="text-default text-sm font-semibold leading-none">{t("role")}</h2>
          </div>
          {/* Role List Items */}
          <div className="bg-default border-subtle divide-subtle flex flex-col divide-y rounded-[10px] border">
            {roles.map((role) => (
              <RoleItem
                role={role}
                key={role.id}
                onClick={() => {
                  // For system roles, open in view-only mode
                  if (role.type === "SYSTEM") {
                    setSelectedRoleId(role.id);
                    setIsOpen(true);
                    return;
                  }

                  if (permissions.canUpdate) {
                    setSelectedRoleId(role.id);
                    setIsOpen(true);
                  }
                }}
                canUpdate={permissions.canUpdate}
                permissions={permissions}
                teamId={teamId}
              />
            ))}
          </div>
          {/* Footer */}
          <div className="px-5 py-4 ">
            {/* Commenting out for now as we don't have a learn more permissions page in docs */}
            {/* <p className="text-subtle text-sm font-medium leading-tight">{t("learn_more_permissions")}</p> */}
          </div>
        </div>
      </div>

      <RoleSheet
        role={selectedRole}
        open={isOpen ?? false}
        onOpenChange={handleSheetOpenChange}
        teamId={teamId}
        scope={scope}
        isPrivate={isPrivate}
      />
    </>
  );
}

function RoleItem({
  role,
  onClick,
  canUpdate,
  permissions,
  teamId,
}: {
  role: Role;
  onClick: () => void;
  canUpdate: boolean;
  permissions: Permissions;
  teamId: number;
}) {
  const { t } = useLocale();
  const showDropdown = role.type !== "SYSTEM" && (permissions.canUpdate || permissions.canDelete);

  return (
    <div
      className={classNames(
        "border-subtle flex p-3",
        (canUpdate && role.type !== "SYSTEM") || role.type === "SYSTEM"
          ? "hover:bg-subtle cursor-pointer"
          : ""
      )}
      onClick={onClick}>
      <div className="flex w-full items-center gap-3 truncate">
        {/* Icon */}
        <div className="flex items-center justify-center">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: role.color ?? "gray" }} />
        </div>
        {/* Role Name */}
        <div className="text-default w-24 truncate text-sm font-semibold leading-none">
          <span>{role.name}</span>
        </div>

        <Badge variant={role.type === "SYSTEM" ? "grayWithoutHover" : "green"}>
          {t(role.type === "SYSTEM" ? "default_role" : "custom_role")}
        </Badge>

        {showDropdown && (
          <div className="ml-auto" onClick={(e) => e.stopPropagation()}>
            <Dropdown>
              <DropdownMenuTrigger asChild>
                <Button variant="icon" color="secondary" StartIcon="ellipsis" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="flex flex-col">
                {permissions.canUpdate && (
                  <DropdownItem StartIcon="pencil" onClick={onClick}>
                    {t("edit")}
                  </DropdownItem>
                )}
                {permissions.canDelete && role.type !== "SYSTEM" && (
                  <DeleteRoleModal roleId={role.id} roleName={role.name} teamId={teamId} />
                )}
              </DropdownMenuContent>
            </Dropdown>
          </div>
        )}
      </div>
    </div>
  );
}
