import type { PermissionContext } from "../tabs/types";
import { UserPermissionRole } from "@calcom/prisma/enums";
import { Resource, CrudAction } from "@calcom/features/pbac/domain/types/permission-registry";

/**
 * Create a mock permission context for testing
 */
export function createMockPermissionContext(overrides?: Partial<PermissionContext>): PermissionContext {
  return {
    userId: 1,
    isAdmin: false,
    isOrgAdmin: false,
    isOrgOwner: false,
    organizationId: undefined,
    organizationSlug: undefined,
    teamMemberships: [],
    features: {},
    resourcePermissions: {},
    identityProvider: undefined,
    twoFactorEnabled: false,
    passwordAdded: true,
    ...overrides,
  };
}

/**
 * Create a mock team membership
 */
export function createMockTeamMembership(overrides?: any) {
  return {
    id: 1,
    role: "MEMBER",
    parentId: null,
    accepted: true,
    ...overrides,
  };
}

/**
 * Create mock resource permissions
 */
export function createMockResourcePermissions(
  resource: Resource,
  permissions: Partial<Record<CrudAction, boolean>>
) {
  return {
    [resource]: {
      [CrudAction.Create]: false,
      [CrudAction.Read]: false,
      [CrudAction.Update]: false,
      [CrudAction.Delete]: false,
      ...permissions,
    },
  };
}

/**
 * Mock environment variables
 */
export function mockEnvironment(overrides?: any) {
  const original = {
    IS_CALCOM: process.env.NEXT_PUBLIC_IS_CALCOM,
    HOSTED_CAL_FEATURES: process.env.NEXT_PUBLIC_HOSTED_CAL_FEATURES,
  };

  Object.assign(process.env, {
    NEXT_PUBLIC_IS_CALCOM: "false",
    NEXT_PUBLIC_HOSTED_CAL_FEATURES: "false",
    ...overrides,
  });

  return () => {
    Object.assign(process.env, original);
  };
}