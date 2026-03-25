import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCheckPermission = vi.fn();
const mockRoleBelongsToTeam = vi.fn();
const mockUpdate = vi.fn();
const mockDeleteRole = vi.fn();
const mockCreateRole = vi.fn();
const mockGetTeamRoles = vi.fn();

vi.mock("@calcom/features/pbac/services/permission-check.service", () => ({
  PermissionCheckService: class {
    checkPermission = mockCheckPermission;
  },
}));

vi.mock("@calcom/features/pbac/services/role.service", () => ({
  RoleService: class {
    roleBelongsToTeam = mockRoleBelongsToTeam;
    update = mockUpdate;
    deleteRole = mockDeleteRole;
    createRole = mockCreateRole;
    getTeamRoles = mockGetTeamRoles;
  },
}));

vi.mock("@calcom/prisma", () => ({
  prisma: {
    membership: { findFirst: vi.fn() },
  },
  default: {},
}));

vi.mock("@calcom/features/di/containers/TeamFeatureRepository", () => ({
  getTeamFeatureRepository: vi.fn(() => ({
    checkIfTeamHasFeature: vi.fn(),
    upsert: vi.fn(),
  })),
}));

// Mock authedProcedure to be a passthrough that injects a fake user
vi.mock("../../../procedures/authedProcedure", async () => {
  const { procedure } = await vi.importActual<typeof import("../../../trpc")>("../../../trpc");
  const { middleware } = await vi.importActual<typeof import("../../../trpc")>("../../../trpc");

  const fakeAuthed = procedure.use(
    middleware(({ next }) => {
      return next({
        ctx: {
          user: { id: 1 },
          session: { user: { id: 1 }, upId: "usr-1" },
        },
      });
    })
  );

  return {
    default: fakeAuthed,
    authedAdminProcedure: fakeAuthed,
    authedOrgAdminProcedure: fakeAuthed,
  };
});

import type { InnerContext } from "../../../createContext";
import { permissionsRouter } from "./_router";

function createTestCaller() {
  const mockContext: InnerContext = {
    prisma: {} as InnerContext["prisma"],
    insightsDb: {} as InnerContext["insightsDb"],
    locale: "en",
    traceContext: {
      traceId: "test-trace-id",
      spanId: "test-span-id",
      operation: "test",
    },
  };
  return permissionsRouter.createCaller(mockContext);
}

describe("PBAC permissions router – IDOR prevention", () => {
  const TEAM_A_ID = 100;
  const ROLE_IN_TEAM_A = "role-team-a-uuid";
  const ROLE_IN_TEAM_B = "role-team-b-uuid";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("updateRole", () => {
    it("should succeed when roleId belongs to the specified teamId", async () => {
      mockCheckPermission.mockResolvedValue(true);
      mockRoleBelongsToTeam.mockResolvedValue(true);
      mockUpdate.mockResolvedValue({ id: ROLE_IN_TEAM_A, name: "Updated Role" });

      const caller = createTestCaller();
      const result = await caller.updateRole({
        teamId: TEAM_A_ID,
        roleId: ROLE_IN_TEAM_A,
        name: "Updated Role",
        permissions: [],
      });

      expect(result).toEqual({ id: ROLE_IN_TEAM_A, name: "Updated Role" });
      expect(mockRoleBelongsToTeam).toHaveBeenCalledWith(ROLE_IN_TEAM_A, TEAM_A_ID);
      expect(mockUpdate).toHaveBeenCalledWith({
        roleId: ROLE_IN_TEAM_A,
        permissions: [],
        updates: { name: "Updated Role", color: undefined },
      });
    });

    it("should throw when roleId does NOT belong to the specified teamId (IDOR attempt)", async () => {
      mockCheckPermission.mockResolvedValue(true);
      mockRoleBelongsToTeam.mockResolvedValue(false);

      const caller = createTestCaller();

      await expect(
        caller.updateRole({
          teamId: TEAM_A_ID,
          roleId: ROLE_IN_TEAM_B,
          name: "Hijacked",
          permissions: [],
        })
      ).rejects.toThrow("Role not found in this team");

      expect(mockRoleBelongsToTeam).toHaveBeenCalledWith(ROLE_IN_TEAM_B, TEAM_A_ID);
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("should not reach ownership check if the user lacks permission", async () => {
      mockCheckPermission.mockResolvedValue(false);

      const caller = createTestCaller();

      await expect(
        caller.updateRole({
          teamId: TEAM_A_ID,
          roleId: ROLE_IN_TEAM_A,
          name: "Test",
          permissions: [],
        })
      ).rejects.toThrow("You don't have permission to update roles");

      expect(mockRoleBelongsToTeam).not.toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe("deleteRole", () => {
    it("should succeed when roleId belongs to the specified teamId", async () => {
      mockCheckPermission.mockResolvedValue(true);
      mockRoleBelongsToTeam.mockResolvedValue(true);
      mockDeleteRole.mockResolvedValue(undefined);

      const caller = createTestCaller();
      const result = await caller.deleteRole({
        teamId: TEAM_A_ID,
        roleId: ROLE_IN_TEAM_A,
      });

      expect(result).toEqual({ success: true });
      expect(mockRoleBelongsToTeam).toHaveBeenCalledWith(ROLE_IN_TEAM_A, TEAM_A_ID);
      expect(mockDeleteRole).toHaveBeenCalledWith(ROLE_IN_TEAM_A);
    });

    it("should throw when roleId does NOT belong to the specified teamId (IDOR attempt)", async () => {
      mockCheckPermission.mockResolvedValue(true);
      mockRoleBelongsToTeam.mockResolvedValue(false);

      const caller = createTestCaller();

      await expect(
        caller.deleteRole({
          teamId: TEAM_A_ID,
          roleId: ROLE_IN_TEAM_B,
        })
      ).rejects.toThrow("Role not found in this team");

      expect(mockRoleBelongsToTeam).toHaveBeenCalledWith(ROLE_IN_TEAM_B, TEAM_A_ID);
      expect(mockDeleteRole).not.toHaveBeenCalled();
    });

    it("should not reach ownership check if the user lacks permission", async () => {
      mockCheckPermission.mockResolvedValue(false);

      const caller = createTestCaller();

      await expect(
        caller.deleteRole({
          teamId: TEAM_A_ID,
          roleId: ROLE_IN_TEAM_A,
        })
      ).rejects.toThrow("You don't have permission to delete roles");

      expect(mockRoleBelongsToTeam).not.toHaveBeenCalled();
      expect(mockDeleteRole).not.toHaveBeenCalled();
    });
  });

  describe("cross-team IDOR scenario", () => {
    it("should prevent an admin of Team A from updating a role belonging to Team B", async () => {
      mockCheckPermission.mockResolvedValue(true);
      mockRoleBelongsToTeam.mockResolvedValue(false);

      const caller = createTestCaller();

      await expect(
        caller.updateRole({
          teamId: TEAM_A_ID,
          roleId: ROLE_IN_TEAM_B,
          name: "Malicious Update",
          permissions: [],
        })
      ).rejects.toThrow("Role not found in this team");

      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it("should prevent an admin of Team A from deleting a role belonging to Team B", async () => {
      mockCheckPermission.mockResolvedValue(true);
      mockRoleBelongsToTeam.mockResolvedValue(false);

      const caller = createTestCaller();

      await expect(
        caller.deleteRole({
          teamId: TEAM_A_ID,
          roleId: ROLE_IN_TEAM_B,
        })
      ).rejects.toThrow("Role not found in this team");

      expect(mockDeleteRole).not.toHaveBeenCalled();
    });
  });
});
