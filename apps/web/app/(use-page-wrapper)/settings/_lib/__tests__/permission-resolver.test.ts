import { describe, it, expect, beforeEach, vi } from "vitest";

import { Resource, CrudAction } from "@calcom/features/pbac/domain/types/permission-registry";
import { UserPermissionRole } from "@calcom/prisma/enums";

import { PermissionResolver } from "../tabs/permission-resolver";
import type { TabConfig } from "../tabs/types";
import {
  createMockPermissionContext,
  createMockTeamMembership,
  createMockResourcePermissions,
  mockEnvironment,
} from "./test-utils";

// Mock external dependencies
vi.mock("@calcom/lib/constants", () => ({
  HOSTED_CAL_FEATURES: false,
  IS_CALCOM: false,
  WEBAPP_URL: "http://localhost:3000",
}));

vi.mock("@calcom/features/auth/lib/checkAdminOrOwner", () => ({
  checkAdminOrOwner: vi.fn((role: string) => role === "ADMIN" || role === "OWNER"),
}));

describe("PermissionResolver", () => {
  let resolver: PermissionResolver;
  let mockContext: any;

  beforeEach(() => {
    mockContext = createMockPermissionContext();
    resolver = new PermissionResolver(mockContext);
  });

  describe("Tab Visibility", () => {
    it("should show tab with no visibility restrictions", () => {
      const tab: TabConfig = {
        key: "basic-tab",
        name: "Basic Tab",
        href: "/basic",
      };

      const result = resolver.processTabs([tab]);
      expect(result).toHaveLength(1);
      expect(result[0].key).toBe("basic-tab");
    });

    it("should hide tab requiring organization when user has no org", () => {
      const tab: TabConfig = {
        key: "org-tab",
        name: "Org Tab",
        href: "/org",
        visibility: {
          requiresOrg: true,
        },
      };

      const result = resolver.processTabs([tab]);
      expect(result).toHaveLength(0);
    });

    it("should show tab requiring organization when user has org", () => {
      mockContext.organizationId = 123;
      resolver = new PermissionResolver(mockContext);

      const tab: TabConfig = {
        key: "org-tab",
        name: "Org Tab",
        href: "/org",
        visibility: {
          requiresOrg: true,
        },
      };

      const result = resolver.processTabs([tab]);
      expect(result).toHaveLength(1);
    });

    it("should respect hosted-only visibility", () => {
      const restoreEnv = mockEnvironment({ NEXT_PUBLIC_IS_CALCOM: "false" });

      const tab: TabConfig = {
        key: "hosted-tab",
        name: "Hosted Tab",
        href: "/hosted",
        visibility: {
          hostedOnly: true,
        },
      };

      const result = resolver.processTabs([tab]);
      expect(result).toHaveLength(0);

      restoreEnv();
    });

    it("should respect self-hosted-only visibility", () => {
      const restoreEnv = mockEnvironment({ NEXT_PUBLIC_HOSTED_CAL_FEATURES: "true" });

      const tab: TabConfig = {
        key: "self-hosted-tab",
        name: "Self Hosted Tab",
        href: "/self-hosted",
        visibility: {
          selfHostedOnly: true,
        },
      };

      const result = resolver.processTabs([tab]);
      expect(result).toHaveLength(0);

      restoreEnv();
    });
  });

  describe("Permission Checks", () => {
    it("should check admin role permissions", () => {
      const tab: TabConfig = {
        key: "admin-tab",
        name: "Admin Tab",
        href: "/admin",
        permissions: {
          roles: [UserPermissionRole.ADMIN],
        },
      };

      // User is not admin
      let result = resolver.processTabs([tab]);
      expect(result).toHaveLength(0);

      // User is admin
      mockContext.isAdmin = true;
      resolver = new PermissionResolver(mockContext);
      result = resolver.processTabs([tab]);
      expect(result).toHaveLength(1);
    });

    it("should check organization role permissions", () => {
      const tab: TabConfig = {
        key: "org-admin-tab",
        name: "Org Admin Tab",
        href: "/org-admin",
        permissions: {
          orgRoles: ["ADMIN"],
        },
      };

      // User is not org admin
      let result = resolver.processTabs([tab]);
      expect(result).toHaveLength(0);

      // User is org admin
      mockContext.isOrgAdmin = true;
      resolver = new PermissionResolver(mockContext);
      result = resolver.processTabs([tab]);
      expect(result).toHaveLength(1);
    });

    it("should check team role permissions", () => {
      const tab: TabConfig = {
        key: "team-admin-tab",
        name: "Team Admin Tab",
        href: "/team-admin",
        permissions: {
          teamRoles: ["ADMIN"],
        },
      };

      // User has no team memberships
      let result = resolver.processTabs([tab]);
      expect(result).toHaveLength(0);

      // User is team admin
      mockContext.teamMemberships = [createMockTeamMembership({ role: "ADMIN" })];
      resolver = new PermissionResolver(mockContext);
      result = resolver.processTabs([tab]);
      expect(result).toHaveLength(1);
    });

    it("should check feature flag permissions", () => {
      const tab: TabConfig = {
        key: "feature-tab",
        name: "Feature Tab",
        href: "/feature",
        permissions: {
          features: ["awesome-feature"],
        },
      };

      // Feature is disabled
      let result = resolver.processTabs([tab]);
      expect(result).toHaveLength(0);

      // Feature is enabled
      mockContext.features = { "awesome-feature": true };
      resolver = new PermissionResolver(mockContext);
      result = resolver.processTabs([tab]);
      expect(result).toHaveLength(1);
    });

    it("should check resource permissions (PBAC)", () => {
      const tab: TabConfig = {
        key: "resource-tab",
        name: "Resource Tab",
        href: "/resource",
        permissions: {
          resources: [
            {
              resource: Resource.Role,
              action: CrudAction.Read,
            },
          ],
        },
      };

      // User has no permissions
      let result = resolver.processTabs([tab]);
      expect(result).toHaveLength(0);

      // User has read permission for roles
      mockContext.resourcePermissions = createMockResourcePermissions(Resource.Role, {
        [CrudAction.Read]: true,
      });
      resolver = new PermissionResolver(mockContext);
      result = resolver.processTabs([tab]);
      expect(result).toHaveLength(1);
    });

    it("should check custom permission function", () => {
      const tab: TabConfig = {
        key: "custom-tab",
        name: "Custom Tab",
        href: "/custom",
        permissions: {
          custom: (ctx) => ctx.userId === 42,
        },
      };

      // Custom function returns false
      let result = resolver.processTabs([tab]);
      expect(result).toHaveLength(0);

      // Custom function returns true
      mockContext.userId = 42;
      resolver = new PermissionResolver(mockContext);
      result = resolver.processTabs([tab]);
      expect(result).toHaveLength(1);
    });
  });

  describe("Tab Processing", () => {
    it("should process nested children", () => {
      const tab: TabConfig = {
        key: "parent-tab",
        name: "Parent Tab",
        href: "/parent",
        children: [
          {
            key: "child-1",
            name: "Child 1",
            href: "/child-1",
          },
          {
            key: "child-2",
            name: "Child 2",
            href: "/child-2",
            permissions: {
              custom: () => false, // This child should be filtered out
            },
          },
        ],
      };

      const result = resolver.processTabs([tab]);
      expect(result).toHaveLength(1);
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children![0].key).toBe("child-1");
    });

    it("should resolve function-based href", () => {
      const tab: TabConfig = {
        key: "dynamic-tab",
        name: "Dynamic Tab",
        href: (ctx) => `/dynamic/${ctx.userId}`,
      };

      const result = resolver.processTabs([tab]);
      expect(result).toHaveLength(1);
      expect(result[0].href).toBe("/dynamic/1");
    });

    it("should resolve function-based avatar", () => {
      const tab: TabConfig = {
        key: "avatar-tab",
        name: "Avatar Tab",
        href: "/avatar",
        avatar: (ctx) => `avatar-${ctx.userId}`,
      };

      const result = resolver.processTabs([tab]);
      expect(result).toHaveLength(1);
      expect(result[0].avatar).toBe("avatar-1");
    });
  });

  describe("Team Tab Generation", () => {
    it("should add team tabs", () => {
      const tabs = [
        {
          key: "teams",
          name: "teams",
          href: "/teams",
          visible: true,
          children: [],
        },
      ];

      const mockTeams = [
        {
          id: 1,
          name: "Team 1",
          role: "ADMIN",
          accepted: true,
          parentId: null,
        },
        {
          id: 2,
          name: "Team 2",
          role: "MEMBER",
          accepted: false,
          parentId: null,
        },
      ];

      const result = resolver.addTeamTabs(tabs, mockTeams);
      expect(result[0].children).toHaveLength(2);
      expect(result[0].children![0].name).toBe("Team 1");
      expect(result[0].children![1].name).toBe("Team 2");
    });

    it("should generate appropriate team children based on role", () => {
      const tabs = [
        {
          key: "teams",
          name: "teams",
          href: "/teams",
          visible: true,
          children: [],
        },
      ];

      const mockTeams = [
        {
          id: 1,
          name: "Admin Team",
          role: "ADMIN",
          accepted: true,
          parentId: null,
        },
        {
          id: 2,
          name: "Member Team",
          role: "MEMBER",
          accepted: true,
          parentId: null,
        },
      ];

      const result = resolver.addTeamTabs(tabs, mockTeams);

      // Admin team should have more children (appearance, billing, settings)
      const adminTeamChildren = result[0].children![0].children!;
      const memberTeamChildren = result[0].children![1].children!;

      expect(adminTeamChildren.length).toBeGreaterThan(memberTeamChildren.length);

      // Both should have profile and members
      expect(adminTeamChildren.some((child) => child.name === "profile")).toBe(true);
      expect(adminTeamChildren.some((child) => child.name === "members")).toBe(true);
      expect(memberTeamChildren.some((child) => child.name === "members")).toBe(true);

      // Only admin should have settings
      expect(adminTeamChildren.some((child) => child.name === "settings")).toBe(true);
      expect(memberTeamChildren.some((child) => child.name === "settings")).toBe(false);
    });
  });

  describe("Complex Permission Scenarios", () => {
    it("should handle multiple permission types", () => {
      const tab: TabConfig = {
        key: "complex-tab",
        name: "Complex Tab",
        href: "/complex",
        visibility: {
          requiresOrg: true,
        },
        permissions: {
          orgRoles: ["ADMIN"],
          features: ["complex-feature"],
          resources: [
            {
              resource: Resource.Role,
              action: CrudAction.Read,
            },
          ],
        },
      };

      // User has org but missing other requirements
      mockContext.organizationId = 123;
      resolver = new PermissionResolver(mockContext);
      let result = resolver.processTabs([tab]);
      expect(result).toHaveLength(0);

      // Add org admin role
      mockContext.isOrgAdmin = true;
      resolver = new PermissionResolver(mockContext);
      result = resolver.processTabs([tab]);
      expect(result).toHaveLength(0);

      // Add feature
      mockContext.features = { "complex-feature": true };
      resolver = new PermissionResolver(mockContext);
      result = resolver.processTabs([tab]);
      expect(result).toHaveLength(0);

      // Add resource permission - now it should work
      mockContext.resourcePermissions = createMockResourcePermissions(Resource.Role, {
        [CrudAction.Read]: true,
      });
      resolver = new PermissionResolver(mockContext);
      result = resolver.processTabs([tab]);
      expect(result).toHaveLength(1);
    });
  });
});
