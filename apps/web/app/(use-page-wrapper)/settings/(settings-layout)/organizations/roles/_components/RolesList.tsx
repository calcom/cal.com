"use client";

import { useQueryState } from "nuqs";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Badge } from "@calcom/ui/badge";
import classNames from "@calcom/ui/classNames";

import { roleParsers } from "./searchParams";

type Role = {
  id: string;
  name: string;
  description?: string;
  teamId?: number;
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
}

export function RolesList({ roles, permissions, initialSelectedRole, initialSheetOpen }: RolesListProps) {
  const { t } = useLocale();
  const [isOpen, setIsOpen] = useQueryState("role-sheet", {
    ...roleParsers["role-sheet"],
    defaultValue: initialSheetOpen ?? false,
  });
  const [selectedRoleId, setSelectedRoleId] = useQueryState("role", {
    ...roleParsers.role,
    defaultValue: initialSelectedRole?.id ?? "",
  });

  const selectedRole = roles.find((role) => role.id === selectedRoleId);

  return (
    <div className="mt-4">
      <div className="bg-muted border-muted flex flex-col rounded-xl border p-[1px]">
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
                // Cant edit system roles
                if (role.type === "SYSTEM") {
                  return;
                }

                if (permissions.canUpdate) {
                  setSelectedRoleId(role.id);
                  setIsOpen(true);
                }
              }}
              canUpdate={permissions.canUpdate}
            />
          ))}
        </div>
        {/* Footer */}
        <div className="px-5 py-4 ">
          <p className="text-subtle text-sm font-medium leading-tight">{t("learn_more_permissions")}</p>
        </div>
      </div>
    </div>
  );
}

function RoleItem({ role, onClick, canUpdate }: { role: Role; onClick: () => void; canUpdate: boolean }) {
  return (
    <div
      className={classNames(
        "border-subtle flex p-3",
        canUpdate && role.type !== "SYSTEM" && "hover:bg-subtle cursor-pointer"
      )}
      onClick={onClick}>
      <div className="flex items-center gap-3 truncate">
        {/* Icon */}
        <div className="flex items-center justify-center">
          <div className="h-3 w-3 rounded-full bg-red-500" />
        </div>
        {/* Role Name */}
        <div className="text-deafult w-20 truncate text-sm font-semibold leading-none">
          <span>{role.name}</span>
        </div>

        <Badge variant="grayWithoutHover">{role.type === "SYSTEM" ? "default_role" : "custom_role"}</Badge>
      </div>
    </div>
  );
}
