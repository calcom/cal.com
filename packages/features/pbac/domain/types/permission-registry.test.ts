/**
 * Tests for permission registry utilities and data structure.
 * Testing library/framework: This test suite is written to be compatible with Jest/Vitest style
 * (describe/it/expect). It avoids framework-specific globals (like jest/vi) unless needed.
 */

import {
  CrudAction,
  CustomAction,
  getPermissionsForScope,
  PERMISSION_REGISTRY,
  type PermissionRegistry,
  parsePermissionString,
  Resource,
  Scope,
} from "./permission-registry";

describe("permission-registry: PERMISSION_REGISTRY base structure", () => {
  it("all dependsOn permission strings point to existing resource.action entries", () => {
    const registry: PermissionRegistry = PERMISSION_REGISTRY;

    const hasPermission = (perm: string): boolean => {
      // Use parsePermissionString to handle dotted resource names like "organization.attributes.read"
      const { resource: resKey, action } = parsePermissionString(perm);

      // In registry keys, Resource enums are their string values
      const resourceConfig = registry[resKey as keyof PermissionRegistry] as Record<string, unknown> | undefined;

      if (!resourceConfig) return false;

      // Action might be CrudAction.All ("*") which is a valid key
      return Object.hasOwn(resourceConfig, action);
    };

    Object.values(registry).forEach((cfg) => {
      Object.entries(cfg).forEach(([action, details]) => {
        const d = details as any;
        if (Array.isArray(d.dependsOn)) {
          d.dependsOn.forEach((dep: string) => {
            expect(typeof dep).toBe("string");
            expect(dep.includes(".")).toBe(true);
            expect(hasPermission(dep)).toBe(true);
          });
        }
      });
    });
  });
});

describe("permission-registry: getPermissionsForScope", () => {
  it("Team scope excludes resources without team-eligible actions", () => {
    const team = getPermissionsForScope(Scope.Team);

    // "All" resource has only CrudAction.All with Organization scope -> should be omitted
    expect(team[Resource.All]).toBeUndefined();

    // Booking: Read has no scope (included), ReadTeamBookings has team scope (included),
    // ReadOrgBookings has org scope (excluded)
    expect(team[Resource.Booking]).toBeDefined();
    const booking = team[Resource.Booking];
    expect(booking).toBeDefined();
    expect(booking[CrudAction.Read]).toBeDefined();
    expect(booking[CustomAction.ReadTeamBookings]).toBeDefined();
    expect(booking[CustomAction.ReadOrgBookings as any]).toBeUndefined();

    // Team resource: Create has Organization scope -> excluded in Team scope
    expect(team[Resource.Team]).toBeDefined();
    expect(team[Resource.Team][CrudAction.Create]).toBeUndefined();
    // But Read (no scope) is included
    expect(team[Resource.Team][CrudAction.Read]).toBeDefined();
  });

  it("Organization scope includes org-specific and scope-unspecified actions", () => {
    const org = getPermissionsForScope(Scope.Organization);

    // "All" resource is org-only and should be present with * action
    expect(org[Resource.All]).toBeDefined();
    expect(org[Resource.All][CrudAction.All]).toBeDefined();

    // Booking: Read (no scope) -> included, ReadOrgBookings (org) -> included, ReadTeamBookings (team) -> excluded
    expect(org[Resource.Booking][CrudAction.Read]).toBeDefined();
    expect(org[Resource.Booking][CustomAction.ReadOrgBookings]).toBeDefined();
    expect(org[Resource.Booking][CustomAction.ReadTeamBookings as any]).toBeUndefined();

    // Organization resource contains org-scoped actions
    expect(org[Resource.Organization]).toBeDefined();
    const orgRes = org[Resource.Organization];
    expect(orgRes[CrudAction.Read]).toBeDefined();
    expect(orgRes[CustomAction.ManageBilling]).toBeDefined();
  });

  it("resources with zero eligible actions for a scope are not included", () => {
    // Construct a synthetic registry slice to validate "hasActions" logic indirectly
    // but we will rely on real data: Resource.All should be absent in Team scope
    const team = getPermissionsForScope(Scope.Team);
    expect(team[Resource.All]).toBeUndefined();
  });

  it("backward compatibility: actions without scope appear in both Team and Organization results", () => {
    const team = getPermissionsForScope(Scope.Team);
    const org = getPermissionsForScope(Scope.Organization);

    // Example: CrudAction.Read on Resource.Workflow has no scope -> present in both
    expect(team[Resource.Workflow][CrudAction.Read]).toBeDefined();
    expect(org[Resource.Workflow][CrudAction.Read]).toBeDefined();
  });
});

describe("permission-registry: sanity for PermissionString format", () => {
  it('each dependsOn entry follows "<resource>.<action>" format with valid enum values', () => {
    const registry: PermissionRegistry = PERMISSION_REGISTRY;

    const validResourceValues = new Set<string>(Object.values(Resource));
    const validActionValues = new Set<string>([...Object.values(CrudAction), ...Object.values(CustomAction)]);

    Object.values(registry).forEach((cfg) => {
      Object.entries(cfg).forEach(([action, details]) => {
        const d = details as any;
        (d.dependsOn ?? []).forEach((dep: string) => {
          // Use parsePermissionString to handle dotted resource names like "organization.attributes.read"
          const { resource: res, action: act } = parsePermissionString(dep);
          expect(validResourceValues.has(res)).toBe(true);
          expect(validActionValues.has(act)).toBe(true);
        });
      });
    });
  });
});
