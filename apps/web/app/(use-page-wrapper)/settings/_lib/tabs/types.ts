import type { Resource, CrudAction } from "@calcom/features/pbac/domain/types/permission-registry";
import type { UserPermissionRole } from "@calcom/prisma/enums";

export interface PermissionContext {
  userId: number;
  isAdmin: boolean;
  isOrgAdmin: boolean;
  isOrgOwner: boolean;
  organizationId?: number;
  organizationSlug?: string;
  teamMemberships: Array<{
    id: number;
    role: string;
    parentId?: number | null;
    accepted: boolean;
  }>;
  features: Record<string, boolean>;
  resourcePermissions: Record<string, Record<CrudAction, boolean>>;
  identityProvider?: string;
  twoFactorEnabled?: boolean;
  passwordAdded?: boolean;
}

export interface TabVisibility {
  requiresOrg?: boolean;
  requiresTeam?: boolean;
  hostedOnly?: boolean;
  selfHostedOnly?: boolean;
  requiresIdentityProvider?: string[];
  hideIfNoPassword?: boolean;
}

export interface TabPermissions {
  roles?: UserPermissionRole[];
  orgRoles?: string[];
  teamRoles?: string[];
  features?: string[];
  resources?: Array<{
    resource: Resource;
    action: CrudAction;
  }>;
  custom?: (context: PermissionContext) => boolean;
}

export interface TabConfig {
  key: string;
  name: string;
  href: string;
  icon?: string;
  avatar?: string | ((context: PermissionContext) => string);
  permissions?: TabPermissions;
  visibility?: TabVisibility;
  children?: TabConfig[];
  isExternalLink?: boolean;
  dynamic?: boolean; // For tabs that need dynamic generation (like teams)
}

export interface ProcessedTab {
  key: string;
  name: string;
  href: string;
  icon?: string;
  avatar?: string;
  children?: ProcessedTab[];
  isExternalLink?: boolean;
  visible: boolean;
}
