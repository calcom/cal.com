import { BadRequestException, Logger, NotFoundException } from "@nestjs/common";
import { RolesPermissionsCacheService } from "@/modules/roles/permissions/services/roles-permissions-cache.service";
import { RolesService } from "@/modules/roles/services/roles.service";

type RoleServiceDep = ConstructorParameters<typeof RolesService>[0];
type RolesPermissionsCacheServiceDep = ConstructorParameters<typeof RolesService>[1];

describe("RolesService", () => {
  let service: RolesService;
  let roleService: {
    createRole: jest.Mock;
    getRole: jest.Mock;
    getTeamRoles: jest.Mock;
    roleBelongsToTeam: jest.Mock;
    update: jest.Mock;
    deleteRole: jest.Mock;
  } & RoleServiceDep;
  let cacheService: { deleteTeamPermissionsCache: jest.Mock } & RolesPermissionsCacheServiceDep;

  beforeEach(() => {
    roleService = {
      createRole: jest.fn(),
      getRole: jest.fn(),
      getTeamRoles: jest.fn(),
      roleBelongsToTeam: jest.fn(),
      update: jest.fn(),
      deleteRole: jest.fn(),
    } as unknown as {
      createRole: jest.Mock;
      getRole: jest.Mock;
      getTeamRoles: jest.Mock;
      roleBelongsToTeam: jest.Mock;
      update: jest.Mock;
      deleteRole: jest.Mock;
    } & RoleServiceDep;

    cacheService = { deleteTeamPermissionsCache: jest.fn() } as unknown as {
      deleteTeamPermissionsCache: jest.Mock;
    } & RolesPermissionsCacheServiceDep;

    service = new RolesService(roleService, cacheService as unknown as RolesPermissionsCacheService);

    jest.spyOn(Logger.prototype, "error").mockImplementation();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("createRole", () => {
    it("should create a role and clear cache", async () => {
      const mockRole = { id: "role-1", name: "Editor", teamId: 1 };
      (roleService.createRole as jest.Mock).mockResolvedValue(mockRole);

      const result = await service.createRole(1, { name: "Editor", color: "#ff0000", permissions: [] });

      expect(roleService.createRole).toHaveBeenCalledWith({
        name: "Editor",
        color: "#ff0000",
        description: undefined,
        permissions: [],
        teamId: 1,
        type: "CUSTOM",
      });
      expect(cacheService.deleteTeamPermissionsCache).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockRole);
    });

    it("should throw BadRequestException when role name already exists", async () => {
      (roleService.createRole as jest.Mock).mockRejectedValue(new Error("Role already exists"));

      await expect(service.createRole(1, { name: "Editor" })).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException for permission validation errors", async () => {
      (roleService.createRole as jest.Mock).mockRejectedValue(new Error("Invalid permission"));

      await expect(service.createRole(1, { name: "Editor" })).rejects.toThrow(BadRequestException);
    });

    it("should rethrow non-matching errors", async () => {
      const error = new Error("Database connection failed");
      (roleService.createRole as jest.Mock).mockRejectedValue(error);

      await expect(service.createRole(1, { name: "Editor" })).rejects.toThrow(error);
    });
  });

  describe("getRole", () => {
    it("should return role when found and belongs to team", async () => {
      const mockRole = { id: "role-1", name: "Editor", teamId: 1 };
      (roleService.getRole as jest.Mock).mockResolvedValue(mockRole);

      const result = await service.getRole(1, "role-1");
      expect(result).toEqual(mockRole);
    });

    it("should throw NotFoundException when role not found", async () => {
      (roleService.getRole as jest.Mock).mockResolvedValue(null);

      await expect(service.getRole(1, "role-1")).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException when role belongs to different team", async () => {
      (roleService.getRole as jest.Mock).mockResolvedValue({ id: "role-1", teamId: 2 });

      await expect(service.getRole(1, "role-1")).rejects.toThrow(NotFoundException);
    });
  });

  describe("getTeamRoles", () => {
    it("should return paginated roles", async () => {
      const mockRoles = Array.from({ length: 10 }, (_, i) => ({ id: `role-${i}`, name: `Role ${i}` }));
      (roleService.getTeamRoles as jest.Mock).mockResolvedValue(mockRoles);

      const result = await service.getTeamRoles(1, 2, 3);
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual(mockRoles[2]);
    });

    it("should use default pagination values", async () => {
      (roleService.getTeamRoles as jest.Mock).mockResolvedValue([]);

      await service.getTeamRoles(1);
      expect(roleService.getTeamRoles).toHaveBeenCalledWith(1);
    });
  });

  describe("updateRole", () => {
    it("should update role and clear cache when permissions change", async () => {
      const mockRole = { id: "role-1", name: "Updated" };
      (roleService.roleBelongsToTeam as jest.Mock).mockResolvedValue(true);
      (roleService.update as jest.Mock).mockResolvedValue(mockRole);

      const result = await service.updateRole(1, "role-1", {
        name: "Updated",
        permissions: ["*.*"],
      });

      expect(cacheService.deleteTeamPermissionsCache).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockRole);
    });

    it("should not clear cache when only name/color updated (no permissions)", async () => {
      (roleService.roleBelongsToTeam as jest.Mock).mockResolvedValue(true);
      (roleService.update as jest.Mock).mockResolvedValue({});

      await service.updateRole(1, "role-1", { name: "Updated" });

      expect(cacheService.deleteTeamPermissionsCache).not.toHaveBeenCalled();
    });

    it("should throw NotFoundException when role does not belong to team", async () => {
      (roleService.roleBelongsToTeam as jest.Mock).mockResolvedValue(false);

      await expect(service.updateRole(1, "role-1", { name: "X" })).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException for default role update", async () => {
      (roleService.roleBelongsToTeam as jest.Mock).mockResolvedValue(true);
      (roleService.update as jest.Mock).mockRejectedValue(new Error("Cannot update default roles"));

      await expect(service.updateRole(1, "role-1", { name: "X" })).rejects.toThrow(BadRequestException);
    });

    it("should throw NotFoundException for 'Role not found' errors", async () => {
      (roleService.roleBelongsToTeam as jest.Mock).mockResolvedValue(true);
      (roleService.update as jest.Mock).mockRejectedValue(new Error("Role not found"));

      await expect(service.updateRole(1, "role-1", { name: "X" })).rejects.toThrow(NotFoundException);
    });
  });

  describe("deleteRole", () => {
    it("should delete role and clear cache", async () => {
      const mockRole = { id: "role-1", name: "Editor" };
      (roleService.roleBelongsToTeam as jest.Mock).mockResolvedValue(true);
      (roleService.getRole as jest.Mock).mockResolvedValue(mockRole);
      (roleService.deleteRole as jest.Mock).mockResolvedValue(undefined);

      const result = await service.deleteRole(1, "role-1");

      expect(cacheService.deleteTeamPermissionsCache).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockRole);
    });

    it("should throw NotFoundException when role does not belong to team", async () => {
      (roleService.roleBelongsToTeam as jest.Mock).mockResolvedValue(false);

      await expect(service.deleteRole(1, "role-1")).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException when role not found after ownership check", async () => {
      (roleService.roleBelongsToTeam as jest.Mock).mockResolvedValue(true);
      (roleService.getRole as jest.Mock).mockResolvedValue(null);

      await expect(service.deleteRole(1, "role-1")).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException for default role deletion", async () => {
      (roleService.roleBelongsToTeam as jest.Mock).mockResolvedValue(true);
      (roleService.getRole as jest.Mock).mockResolvedValue({ id: "role-1" });
      (roleService.deleteRole as jest.Mock).mockRejectedValue(new Error("Cannot delete default roles"));

      await expect(service.deleteRole(1, "role-1")).rejects.toThrow(BadRequestException);
    });
  });
});
