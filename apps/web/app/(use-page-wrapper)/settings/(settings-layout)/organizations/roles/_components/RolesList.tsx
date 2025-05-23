"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Badge } from "@calcom/ui/badge";

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

export function RolesList({ roles }: { roles: Roles }) {
  const { t } = useLocale();
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
            <RoleItem role={role} key={role.id} />
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

function RoleItem({ role }: { role: Role }) {
  return (
    <div className="border-subtle flex p-3">
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
