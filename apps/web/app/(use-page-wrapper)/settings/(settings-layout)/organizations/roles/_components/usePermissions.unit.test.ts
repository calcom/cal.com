import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PermissionLevel } from "./usePermissions";

vi.mock("@calcom/features/pbac/domain/types/permission-registry", () => {
  const CrudAction = {
    Create: "create",
    Read: "read",
    Update: "update",
    Delete: "delete",
  } as const;

  const Scope = {
    Team: "team",
    Organization: "organization",
  } as const;

  const PERMISSION_REGISTRY = {
    "*": { _resource: { i18nKey: "all" } },
    calendar: {
      [CrudAction.Create]: {},
      [CrudAction.Read]: {},
      [CrudAction.Update]: {},
      [CrudAction.Delete]: {},
      _resource: { i18nKey: "calendar" },
      _internalMeta: true, // should be ignored
    },
    team: {
      [CrudAction.Read]: {},
      [CrudAction.Update]: {},
      _resource: { i18nKey: "team" },
      _secret: "ignore", // should be ignored
    },
  } as const;

  // Mock getPermissionsForScope to return the registry without the "*" resource
  const getPermissionsForScope = () => {
    const { "*": _, ...rest } = PERMISSION_REGISTRY;
    return rest;
  };

  return { CrudAction, Scope, PERMISSION_REGISTRY, getPermissionsForScope };
});

vi.mock("@calcom/features/pbac/utils/permissionTraversal", () => {
  // Transitive graph (small):
  // team.update -> depends on team.read
  // calendar.delete -> depends on calendar.read
  // Dependents (reverse):
  // team.read -> dependents: team.update
  // calendar.read -> dependents: calendar.delete
  function getTransitiveDependencies(permission: string): string[] {
    switch (permission) {
      case "team.update":
        return ["team.read"];
      case "calendar.delete":
        return ["calendar.read"];
      default:
        return [];
    }
  }
  function getTransitiveDependents(permission: string): string[] {
    switch (permission) {
      case "team.read":
        return ["team.update"];
      case "calendar.read":
        return ["calendar.delete"];
      default:
        return [];
    }
  }
  return { getTransitiveDependencies, getTransitiveDependents };
});

// Import after mocks are set up
import { usePermissions } from "./usePermissions";

describe("usePermissions - permission utilities", () => {
  let perms: ReturnType<typeof usePermissions>;

  beforeEach(() => {
    perms = usePermissions();
  });

  describe("hasAllPermissions", () => {
    it("returns false when no permissions are granted", () => {
      expect(perms.hasAllPermissions([])).toBe(false);
    });

    it("ignores internal keys and requires all non-internal actions across all resources", () => {
      // Missing team.update
      const some = ["calendar.create", "calendar.read", "calendar.update", "calendar.delete", "team.read"];
      expect(perms.hasAllPermissions(some)).toBe(false);

      const all = [
        "calendar.create",
        "calendar.read",
        "calendar.update",
        "calendar.delete",
        "team.read",
        "team.update",
      ];
      expect(perms.hasAllPermissions(all)).toBe(true);
    });

    it("treats presence of *.* as sufficient only if individual perms also complete after modifications", () => {
      // "*.*" by itself doesn't add individual entries; hasAllPermissions checks registry entries presence
      expect(perms.hasAllPermissions(["*.*"])).toBe(false);

      const fullPlusStar = [
        "calendar.create",
        "calendar.read",
        "calendar.update",
        "calendar.delete",
        "team.read",
        "team.update",
        "*.*",
      ];
      expect(perms.hasAllPermissions(fullPlusStar)).toBe(true);
    });
  });

  describe("getResourcePermissionLevel", () => {
    it("returns 'all' for '*' only when *.* is present", () => {
      expect(perms.getResourcePermissionLevel("*", [])).toBe("none");
      expect(perms.getResourcePermissionLevel("*", ["*.*"])).toBe("all");
    });

    it("returns 'none' for unknown resources even with wildcard", () => {
      // Unknown resources return 'none' because they're not in the registry
      // The wildcard check only applies to known resources
      expect(perms.getResourcePermissionLevel("unknown", ["*.*"])).toBe("none");
      expect(perms.getResourcePermissionLevel("unknown", [])).toBe("none");
    });

    it("returns 'all' when all non-internal actions for resource are granted", () => {
      const list = ["calendar.create", "calendar.read", "calendar.update", "calendar.delete"];
      expect(perms.getResourcePermissionLevel("calendar", list)).toBe("all");
    });

    it("returns 'read' when only read is present", () => {
      expect(perms.getResourcePermissionLevel("team", ["team.read"])).toBe("read");
    });

    it("returns 'none' when no perms for that resource are present", () => {
      expect(perms.getResourcePermissionLevel("team", ["calendar.read"])).toBe("none");
    });

    it("returns 'all' for any resource when wildcard exists", () => {
      expect(perms.getResourcePermissionLevel("team", ["*.*"])).toBe("all");
      expect(perms.getResourcePermissionLevel("calendar", ["*.*"])).toBe("all");
    });
  });

  describe("toggleResourcePermissionLevel", () => {
    it("for '*' with level 'all' adds '*.*' and all individual permissions", () => {
      const next = perms.toggleResourcePermissionLevel("*", "all", []);
      // Should include star and all concrete perms (6 in our registry)
      expect(next).toEqual(
        expect.arrayContaining([
          "*.*",
          "calendar.create",
          "calendar.read",
          "calendar.update",
          "calendar.delete",
          "team.read",
          "team.update",
        ])
      );
      // No duplicates
      expect(new Set(next).size).toBe(next.length);
    });

    it("for '*' with level 'none' removes '*.*' and leaves empty set", () => {
      const next = perms.toggleResourcePermissionLevel("*", "none", ["*.*", "calendar.read", "team.read"]);
      expect(next).not.toContain("*.*");
      // Because we removed *.*, we don't auto-remove individuals unless resource-specific; keep others
      expect(next).toEqual(expect.arrayContaining(["calendar.read", "team.read"]));
    });

    it("for specific resource with 'none' removes that resource's permissions only", () => {
      const current = ["calendar.create", "calendar.read", "calendar.update", "team.read"];
      const next = perms.toggleResourcePermissionLevel("calendar", "none", current);
      expect(next).toEqual(["team.read"]);
    });

    it("for specific resource with 'read' keeps only read for that resource", () => {
      const current = ["calendar.create", "calendar.read", "calendar.update", "team.read"];
      const next = perms.toggleResourcePermissionLevel("calendar", "read", current);
      // calendar.* collapsed to read only; team.read preserved
      expect(next.sort()).toEqual(["calendar.read", "team.read"].sort());
    });

    it("for specific resource with 'all' expands to all non-internal actions for that resource", () => {
      const current = ["team.read"];
      const next = perms.toggleResourcePermissionLevel("calendar", "all", current);
      expect(next).toEqual(
        expect.arrayContaining([
          "calendar.create",
          "calendar.read",
          "calendar.update",
          "calendar.delete",
          "team.read",
        ])
      );
    });

    it("re-adds '*.*' when post-change state has all permissions across all resources", () => {
      const almostAll = [
        "calendar.create",
        "calendar.read",
        "calendar.update",
        "calendar.delete",
        "team.read",
      ];
      const next = perms.toggleResourcePermissionLevel("team", "all", almostAll);
      expect(next).toEqual(expect.arrayContaining(["*.*"]));
      expect(perms.hasAllPermissions(next)).toBe(true);
    });

    it("no-ops and returns currentPermissions when resource not in registry", () => {
      const curr = ["team.read"];
      const next = perms.toggleResourcePermissionLevel("nonexistent", "all", curr);
      // Implementation returns currentPermissions unchanged for unknown resource
      expect(next).toBe(curr);
    });
  });

  describe("toggleSinglePermission", () => {
    it("enabling a permission adds it and its transitive dependencies, without duplicates", () => {
      const next = perms.toggleSinglePermission("team.update", true, []);
      expect(next).toEqual(expect.arrayContaining(["team.update", "team.read"]));
      // unique
      expect(new Set(next).size).toBe(next.length);
    });

    it("disabling a permission removes it and all its transitive dependents", () => {
      const current = ["team.read", "team.update", "calendar.read"];
      const next = perms.toggleSinglePermission("team.read", false, current);
      // team.update depends on team.read, so it should also be removed
      expect(next).toEqual(["calendar.read"]);
    });

    it("does not remove unrelated permissions when disabling one", () => {
      const current = ["calendar.read", "team.read", "team.update"];
      const next = perms.toggleSinglePermission("calendar.read", false, current);
      // calendar.delete depends on read, so delete should be removed too if present; but it's not
      expect(next.sort()).toEqual(["team.read", "team.update"].sort());
    });

    it("re-adds '*.*' when after toggling, all permissions are present", () => {
      const allButStar = [
        "calendar.create",
        "calendar.read",
        "calendar.update",
        "calendar.delete",
        "team.read",
      ];
      const next = perms.toggleSinglePermission("team.update", true, allButStar);
      expect(perms.hasAllPermissions(next)).toBe(true);
      expect(next).toEqual(expect.arrayContaining(["*.*"]));
    });

    it("adding a permission for unknown resource still just adds/removes string tokens (since traversal returns none)", () => {
      const start: string[] = [];
      const add = perms.toggleSinglePermission("ghost.read", true, start);
      expect(add).toEqual(["ghost.read"]);
      const rem = perms.toggleSinglePermission("ghost.read", false, add);
      expect(rem).toEqual([]);
    });
  });
});
