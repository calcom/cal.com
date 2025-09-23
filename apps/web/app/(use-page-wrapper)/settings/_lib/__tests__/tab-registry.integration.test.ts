import { describe, it, expect, vi, beforeEach } from "vitest";

import { Resource, CrudAction } from "@calcom/features/pbac/domain/types/permission-registry";
import { UserPermissionRole } from "@calcom/prisma/enums";

import { PermissionResolver } from "../tabs/permission-resolver";
import { SETTINGS_TABS, resolveTabHref } from "../tabs/tab-registry";
import { createMockPermissionContext, createMockResourcePermissions, mockEnvironment } from "./test-utils";

// Mock external dependencies
vi.mock("@calcom/lib/constants", () => ({
  HOSTED_CAL_FEATURES: false,
  IS_CALCOM: false,
  WEBAPP_URL: "http://localhost:3000",
}));

vi.mock("@calcom/features/auth/lib/checkAdminOrOwner", () => ({
  checkAdminOrOwner: vi.fn((role: string) => role === "ADMIN" || role === "OWNER"),
}));

describe("Tab Registry Integration", () => {
  let resolver: PermissionResolver;

  describe("Tab Structure Validation", () => {
    it("should have required properties for all tabs", () => {
      SETTINGS_TABS.forEach((tab) => {
        expect(tab.key).toBeDefined();
        expect(tab.name).toBeDefined();
        expect(tab.href).toBeDefined();
        expect(typeof tab.key).toBe("string");
        expect(typeof tab.name).toBe("string");

        // href can be string or function
        expect(typeof tab.href === "string" || typeof tab.href === "function").toBe(true);

        // Children should be array if defined
        if (tab.children) {
          expect(Array.isArray(tab.children)).toBe(true);
        }
      });
    });

    it("should have unique keys across all tabs", () => {
      const keys = new Set();

      const collectKeys = (tabs: any[]) => {
        tabs.forEach((tab) => {
          expect(keys.has(tab.key)).toBe(false);
          keys.add(tab.key);

          if (tab.children) {
            collectKeys(tab.children);
          }
        });
      };

      collectKeys(SETTINGS_TABS);
    });
  });

  describe("Regular User Permissions", () => {
    beforeEach(() => {
      const context = createMockPermissionContext();
      resolver = new PermissionResolver(context);
    });

    it("should show basic tabs for regular user", () => {
      const result = resolver.processTabs(SETTINGS_TABS);

      const visibleKeys = result.map((tab) => tab.key);
      expect(visibleKeys).toContain("my_account");
      expect(visibleKeys).toContain("security");
      expect(visibleKeys).toContain("billing");
      expect(visibleKeys).toContain("developer");
    });

    it("should hide admin-only tabs for regular user", () => {
      const result = resolver.processTabs(SETTINGS_TABS);

      const visibleKeys = result.map((tab) => tab.key);
      expect(visibleKeys).not.toContain("admin");
    });

    it("should hide organization tabs for user without org", () => {
      const result = resolver.processTabs(SETTINGS_TABS);

      const visibleKeys = result.map((tab) => tab.key);
      expect(visibleKeys).not.toContain("organization");
    });
  });

  describe("Admin User Permissions", () => {
    beforeEach(() => {
      const context = createMockPermissionContext({
        isAdmin: true,
      });
      resolver = new PermissionResolver(context);
    });

    it("should show admin tabs for admin user", () => {
      const result = resolver.processTabs(SETTINGS_TABS);

      const visibleKeys = result.map((tab) => tab.key);
      expect(visibleKeys).toContain("admin");
    });

    it("should show all admin children tabs", () => {
      const result = resolver.processTabs(SETTINGS_TABS);

      const adminTab = result.find((tab) => tab.key === "admin");
      expect(adminTab?.children?.length).toBeGreaterThan(0);

      const childKeys = adminTab?.children?.map((child) => child.key) || [];
      expect(childKeys).toContain("admin_features");
      expect(childKeys).toContain("admin_users");
      expect(childKeys).toContain("admin_organizations");
    });
  });

  describe("Organization User Permissions", () => {
    beforeEach(() => {
      const context = createMockPermissionContext({
        organizationId: 123,
        organizationSlug: "test-org",
        isOrgAdmin: true,
        features: {
          "delegation-credential": true,
          pbac: true,
        },
        resourcePermissions: createMockResourcePermissions(Resource.Role, {
          [CrudAction.Read]: true,
        }),
      });
      resolver = new PermissionResolver(context);
    });

    it("should show organization tab for org user", () => {
      const result = resolver.processTabs(SETTINGS_TABS);

      const visibleKeys = result.map((tab) => tab.key);
      expect(visibleKeys).toContain("organization");
    });

    it("should show org admin tabs", () => {
      const result = resolver.processTabs(SETTINGS_TABS);

      const orgTab = result.find((tab) => tab.key === "organization");
      const childKeys = orgTab?.children?.map((child) => child.key) || [];

      expect(childKeys).toContain("org_privacy");
      expect(childKeys).toContain("org_billing");
      expect(childKeys).toContain("org_sso");
      expect(childKeys).toContain("org_dsync");
    });

    it("should show feature-gated tabs when features are enabled", () => {
      const result = resolver.processTabs(SETTINGS_TABS);

      const orgTab = result.find((tab) => tab.key === "organization");
      const childKeys = orgTab?.children?.map((child) => child.key) || [];

      expect(childKeys).toContain("org_delegation");
      expect(childKeys).toContain("org_roles");
    });

    it("should show other teams tab for org admin", () => {
      const result = resolver.processTabs(SETTINGS_TABS);

      const visibleKeys = result.map((tab) => tab.key);
      expect(visibleKeys).toContain("other_teams");
    });
  });

  describe("Environment-specific Tabs", () => {
    it("should show hosted-only tabs in hosted environment", () => {
      const restoreEnv = mockEnvironment({ NEXT_PUBLIC_IS_CALCOM: "true" });

      const context = createMockPermissionContext({ isAdmin: true });
      resolver = new PermissionResolver(context);

      const result = resolver.processTabs(SETTINGS_TABS);
      const adminTab = result.find((tab) => tab.key === "admin");
      const childKeys = adminTab?.children?.map((child) => child.key) || [];

      expect(childKeys).toContain("admin_create_org");
      expect(childKeys).toContain("admin_create_license");

      restoreEnv();
    });

    it("should show self-hosted-only tabs in self-hosted environment", () => {
      const restoreEnv = mockEnvironment({ NEXT_PUBLIC_HOSTED_CAL_FEATURES: "false" });

      const context = createMockPermissionContext();
      resolver = new PermissionResolver(context);

      const result = resolver.processTabs(SETTINGS_TABS);
      const securityTab = result.find((tab) => tab.key === "security");
      const childKeys = securityTab?.children?.map((child) => child.key) || [];

      expect(childKeys).toContain("sso_configuration");

      restoreEnv();
    });
  });

  describe("Dynamic Tab Generation", () => {
    it("should generate team tabs correctly", () => {
      const context = createMockPermissionContext();
      resolver = new PermissionResolver(context);

      const mockTeams = [
        {
          id: 1,
          name: "Team Alpha",
          role: "ADMIN",
          accepted: true,
          parentId: null,
        },
        {
          id: 2,
          name: "Team Beta",
          role: "MEMBER",
          accepted: true,
          parentId: null,
        },
      ];

      let tabs = resolver.processTabs(SETTINGS_TABS);
      tabs = resolver.addTeamTabs(tabs, mockTeams);

      const teamsTab = tabs.find((tab) => tab.key === "teams");
      expect(teamsTab?.children).toHaveLength(2);

      const teamAlpha = teamsTab?.children?.find((child) => child.name === "Team Alpha");
      const teamBeta = teamsTab?.children?.find((child) => child.name === "Team Beta");

      expect(teamAlpha).toBeDefined();
      expect(teamBeta).toBeDefined();

      // Admin team should have more children than member team
      expect(teamAlpha?.children?.length).toBeGreaterThan(teamBeta?.children?.length || 0);
    });
  });

  describe("Complex Permission Scenarios", () => {
    it("should handle Google SSO user without password correctly", () => {
      const context = createMockPermissionContext({
        identityProvider: "GOOGLE",
        twoFactorEnabled: false,
        passwordAdded: false,
      });
      resolver = new PermissionResolver(context);

      const result = resolver.processTabs(SETTINGS_TABS);
      const securityTab = result.find((tab) => tab.key === "security");
      const childKeys = securityTab?.children?.map((child) => child.key) || [];

      expect(childKeys).not.toContain("2fa_auth");
    });

    it("should handle org admin without PBAC feature", () => {
      const context = createMockPermissionContext({
        organizationId: 123,
        isOrgAdmin: true,
        features: {
          pbac: false, // PBAC disabled
        },
      });
      resolver = new PermissionResolver(context);

      const result = resolver.processTabs(SETTINGS_TABS);
      const orgTab = result.find((tab) => tab.key === "organization");
      const childKeys = orgTab?.children?.map((child) => child.key) || [];

      expect(childKeys).not.toContain("org_roles");
    });

    it("should filter admin API tab for non-org-admins in developer section", () => {
      const context = createMockPermissionContext({
        organizationId: 123,
        isOrgAdmin: false, // Not org admin
      });
      resolver = new PermissionResolver(context);

      const result = resolver.processTabs(SETTINGS_TABS);
      const developerTab = result.find((tab) => tab.key === "developer");
      const childKeys = developerTab?.children?.map((child) => child.key) || [];

      expect(childKeys).not.toContain("admin_api");
    });
  });

  describe("Helper Functions", () => {
    it("should resolve tab href correctly", () => {
      const context = createMockPermissionContext({
        organizationSlug: "test-org",
      });

      const stringHref = resolveTabHref(
        {
          key: "test",
          name: "test",
          href: "/static",
        },
        context
      );
      expect(stringHref).toBe("/static");

      const functionHref = resolveTabHref(
        {
          key: "test",
          name: "test",
          href: (ctx) => `/dynamic/${ctx.organizationSlug}`,
        },
        context
      );
      expect(functionHref).toBe("/dynamic/test-org");
    });
  });
});
