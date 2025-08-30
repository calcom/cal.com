/**
 * Note: This test suite follows the project's primary test runner.
 * - Framework: (auto-detected at generation time; prefer Vitest if present, else Jest)
 * - If using Vitest, we import describe/it/expect from "vitest".
 * - If using Jest, we rely on global describe/it/expect typings.
 */

import {
  filterResourceConfig,
  getPermissionsForScope,
  PERMISSION_REGISTRY,
  Resource,
  CrudAction,
  CustomAction,
  Scope,
  type ResourceConfig,
  type PermissionDetails,
} from "../permission-registry";

// Conditionally import matchers for Vitest environments
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - optional import; no-op in Jest
import { describe, it, expect } from "vitest";

describe("permission-registry: filterResourceConfig", () => {
  it("removes the _resource property and preserves other actions", () => {
    const config: ResourceConfig = {
      _resource: { i18nKey: "test_resource" },
      [CrudAction.Read]: {
        description: "read",
        category: "x",
        i18nKey: "read",
        descriptionI18nKey: "read_desc",
      } as PermissionDetails,
      [CustomAction.Invite]: {
        description: "invite",
        category: "x",
        i18nKey: "invite",
        descriptionI18nKey: "invite_desc",
        dependsOn: ["team.read"],
      } as PermissionDetails,
    };

    const original = { ...config };
    const filtered = filterResourceConfig(config);

    // _resource stripped
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((filtered as any)._resource).toBeUndefined();

    // Other keys preserved
    expect(filtered[CrudAction.Read]).toBeDefined();
    expect(filtered[CustomAction.Invite]).toBeDefined();

    // Original object not mutated
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((config as any)._resource).toEqual(original._resource);
  });

  it("returns a shallow copy (mutations on result do not affect input)", () => {
    const config: ResourceConfig = {
      _resource: { i18nKey: "abc" },
    };
    const filtered = filterResourceConfig(config);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (filtered as any).extra = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((config as any).extra).toBeUndefined();
  });
});

describe("permission-registry: getPermissionsForScope", () => {
  it("TEAM scope excludes All.* and Organization-only resources", () => {
    const team = getPermissionsForScope(Scope.Team);

    // All.* is Organization-only; resource should be omitted for TEAM
    expect(team[Resource.All]).toBeUndefined();

    // Organization resource has only org-scoped actions; should be omitted
    expect(team[Resource.Organization]).toBeUndefined();

    // Team resource is present but excludes org-scoped Create
    const teamCfg = team[Resource.Team];
    expect(teamCfg).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actions = Object.keys(teamCfg as any);
    expect(actions).toContain(CrudAction.Read);
    expect(actions).toContain(CrudAction.Update);
    expect(actions).toContain(CrudAction.Delete);
    expect(actions).toContain(CustomAction.Invite);
    expect(actions).toContain(CustomAction.Remove);
    expect(actions).toContain(CustomAction.ChangeMemberRole);
    expect(actions).not.toContain(CrudAction.Create);
  });

  it("ORGANIZATION scope includes All.* and org-scoped actions but excludes team-scoped actions", () => {
    const org = getPermissionsForScope(Scope.Organization);

    // All.* should be present
    const allCfg = org[Resource.All];
    expect(allCfg).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((allCfg as any)[CrudAction.All]).toBeDefined();

    // Team resource includes Create at org scope
    const teamCfg = org[Resource.Team];
    // Team has Create scoped to Organization; other actions are unscoped (included)
    expect(teamCfg).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((teamCfg as any)[CrudAction.Create]).toBeDefined();

    // Booking resource: Org scope should include read, update, recordings, and readOrgBookings
    const bookingCfg = org[Resource.Booking];
    expect(bookingCfg).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const actions = Object.keys(bookingCfg as any);
    expect(actions).toContain(CrudAction.Read);
    expect(actions).toContain(CrudAction.Update);
    expect(actions).toContain(CustomAction.ReadRecordings);
    expect(actions).toContain(CustomAction.ReadOrgBookings);
    expect(actions).not.toContain(CustomAction.ReadTeamBookings); // team-only
  });

  it("resources with zero actions for a scope are filtered out (hasActions check)", () => {
    const team = getPermissionsForScope(Scope.Team);
    // Organization contains only org-scoped permissions, hence filtered out for TEAM
    expect(team[Resource.Organization]).toBeUndefined();
  });

  it("preserves dependsOn relationships for included actions", () => {
    const org = getPermissionsForScope(Scope.Organization);
    const orgCfg = org[Resource.Organization];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invite = (orgCfg as any)[CustomAction.Invite] as PermissionDetails | undefined;
    expect(invite).toBeDefined();
    expect(invite?.dependsOn).toContain("organization.listMembers");
  });
});

describe("permission-registry: PERMISSION_REGISTRY shape (spot checks)", () => {
  it("contains required resources with _resource i18nKey", () => {
    const role = PERMISSION_REGISTRY[Resource.Role];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((role as any)._resource).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((role as any)._resource.i18nKey).toBe("pbac_resource_role");
  });

  it("defines canonical CRUD details for Role.read", () => {
    const role = PERMISSION_REGISTRY[Resource.Role];
    const read = role[CrudAction.Read] as PermissionDetails | undefined;
    expect(read).toBeDefined();
    expect(read?.category).toBe("role");
    expect(read?.i18nKey).toBe("pbac_action_read");
  });

  it("Booking.readTeamBookings is team-scoped and depends on booking.read", () => {
    const booking = PERMISSION_REGISTRY[Resource.Booking];
    const t = booking[CustomAction.ReadTeamBookings] as PermissionDetails | undefined;
    expect(t).toBeDefined();
    expect(t?.scope).toEqual([Scope.Team]);
    expect(t?.dependsOn).toContain("booking.read");
  });
});