import type { Resource, CrudAction, CustomAction } from "../types/permission-registry";

export interface Permission {
  resource: Resource;
  action: CrudAction | CustomAction;
  description?: string;
  category?: string;
}

export interface PermissionCheck {
  membershipId?: number;
  userId?: number;
  teamId?: number;
}

export interface TeamPermissions {
  teamId: number;
  roleId: string;
  permissions: Permission[];
}

// Value Objects
export interface PermissionPattern {
  resource: Resource | "*";
  action: CrudAction | CustomAction | "*";
}

export interface PermissionValidationResult {
  isValid: boolean;
  error?: string | null;
}
