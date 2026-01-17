import { CreateTeamRoleInput } from "@/modules/organizations/teams/roles/inputs/create-team-role.input";
import { UpdateTeamRoleInput } from "@/modules/organizations/teams/roles/inputs/update-team-role.input";
import { RolesPermissionsCacheService } from "@/modules/roles/permissions/services/roles-permissions-cache.service";
import { BadRequestException, Injectable, NotFoundException, Logger } from "@nestjs/common";

import { RoleService } from "@calcom/platform-libraries/pbac";
import type { CreateRoleData, UpdateRolePermissionsData } from "@calcom/platform-libraries/pbac";

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);
  constructor(
    private readonly rolesService: RoleService,
    private readonly rolesPermissionsCacheService: RolesPermissionsCacheService
  ) {}

  async createRole(teamId: number, data: CreateTeamRoleInput) {
    const createRoleData: CreateRoleData = {
      name: data.name,
      color: data.color,
      description: data.description,
      permissions: data.permissions || [],
      teamId: teamId,
      type: "CUSTOM",
    };

    try {
      const role = await this.rolesService.createRole(createRoleData);

      await this.rolesPermissionsCacheService.deleteTeamPermissionsCache(teamId);

      return role;
    } catch (error) {
      this.logger.error(
        `RolesService - createRole failed (teamId=${teamId}, roleName=${data.name}): ${
          error instanceof Error ? `${error.name}: ${error.message}` : String(error)
        }`,
        error instanceof Error ? error.stack : undefined
      );
      if (error instanceof Error) {
        if (error.message.includes("already exists")) {
          throw new BadRequestException(error.message);
        }
        // Map permission validation failures from PBAC service
        if (error.message.toLowerCase().includes("permission")) {
          throw new BadRequestException(error.message);
        }
      }
      throw error;
    }
  }

  async getRole(teamId: number, roleId: string) {
    const role = await this.rolesService.getRole(roleId);

    if (!role || role.teamId !== teamId) {
      throw new NotFoundException(`Role with id ${roleId} within team id ${teamId} not found`);
    }

    return role;
  }

  async getTeamRoles(teamId: number, skip = 0, take = 250) {
    const allRoles = await this.rolesService.getTeamRoles(teamId);

    const paginatedRoles = allRoles.slice(skip, skip + take);

    return paginatedRoles;
  }

  async updateRole(teamId: number, roleId: string, data: UpdateTeamRoleInput) {
    const belongsToTeam = await this.rolesService.roleBelongsToTeam(roleId, teamId);
    if (!belongsToTeam) {
      throw new NotFoundException(`Role with id ${roleId} within team id ${teamId} not found`);
    }

    const updateData: UpdateRolePermissionsData = {
      roleId,
      permissions: data.permissions,
      updates: {
        name: data.name,
        color: data.color,
      },
    };

    try {
      const role = await this.rolesService.update(updateData);

      if (data.permissions) {
        await this.rolesPermissionsCacheService.deleteTeamPermissionsCache(teamId);
      }

      return role;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("Role not found")) {
          throw new NotFoundException(error.message);
        }
        if (error.message.includes("Cannot update default roles")) {
          throw new BadRequestException(error.message);
        }
        if (
          error.message.includes("Invalid permissions provided") ||
          error.message.toLowerCase().includes("permission")
        ) {
          throw new BadRequestException(error.message);
        }
      }
      throw error;
    }
  }

  async deleteRole(teamId: number, roleId: string) {
    const belongsToTeam = await this.rolesService.roleBelongsToTeam(roleId, teamId);
    if (!belongsToTeam) {
      throw new NotFoundException(`Role with id ${roleId} within team id ${teamId} not found`);
    }

    const role = await this.rolesService.getRole(roleId);
    if (!role) {
      throw new NotFoundException(`Role with id ${roleId} within team id ${teamId} not found`);
    }

    try {
      await this.rolesService.deleteRole(roleId);

      await this.rolesPermissionsCacheService.deleteTeamPermissionsCache(teamId);

      return role;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("Cannot delete default roles")) {
          throw new BadRequestException(error.message);
        }

        if (error.message.includes("Role not found")) {
          throw new NotFoundException(error.message);
        }
      }
      throw error;
    }
  }
}
