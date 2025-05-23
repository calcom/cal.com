import type { RoleType } from "@calcom/prisma/enums";

import type { PermissionString } from "../types/permission-registry";

export interface RolePermission {
  id: string;
  resource: string;
  action: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  teamId?: number;
  type: RoleType;
  permissions: RolePermission[];
  createdAt: Date;
  updatedAt: Date;
}

// Value Objects
export interface CreateRoleData {
  name: string;
  description?: string;
  teamId?: number;
  permissions: PermissionString[];
  type?: RoleType;
}

export interface UpdateRolePermissionsData {
  roleId: string;
  permissions: PermissionString[];
}
