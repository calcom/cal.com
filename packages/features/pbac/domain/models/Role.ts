import type { PermissionString } from "../types/permission-registry";

export const RoleType = {
  SYSTEM: "SYSTEM",
  CUSTOM: "CUSTOM",
} as const;

export type RoleType = (typeof RoleType)[keyof typeof RoleType];

export interface RolePermission {
  id: string;
  roleId: string;
  resource: string;
  action: string;
  createdAt: Date;
}

export interface Role {
  id: string;
  name: string;
  color?: string;
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
  color?: string;
  description?: string;
  teamId?: number;
  permissions: PermissionString[];
  type?: RoleType;
}

export interface UpdateRolePermissionsData {
  roleId: string;
  permissions?: PermissionString[];
  updates?: {
    color?: string;
    name?: string;
  };
}

export type PermissionChange = {
  resource: string;
  action: string;
};
