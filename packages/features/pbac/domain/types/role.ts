export enum RoleType {
  SYSTEM = "SYSTEM",
  CUSTOM = "CUSTOM",
}

export interface Role {
  id: string;
  name: string;
  color?: string | null;
  description?: string | null;
  teamId?: number | null;
  permissions: RolePermission[];
  createdAt: Date;
  updatedAt: Date;
  type: RoleType;
}

export interface RolePermission {
  id: string;
  roleId: string;
  resource: string;
  action: string;
  createdAt: Date;
}
