import { CreateRoleInput } from "@/modules/organizations/roles/inputs/create-role.input";
import { UpdateRoleInput } from "@/modules/organizations/roles/inputs/update-role.input";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";

import { RoleService } from "@calcom/platform-libraries/pbac";
import type { CreateRoleData, UpdateRolePermissionsData } from "@calcom/platform-libraries/pbac";

import { OrganizationsRolesOutputService } from "./organizations-roles-output.service";

@Injectable()
export class OrganizationsRolesService {
  constructor(
    private readonly roleService: RoleService,
    private readonly organizationsRolesOutputService: OrganizationsRolesOutputService
  ) {}

  async createRole(teamId: number, data: CreateRoleInput) {
    const createRoleData: CreateRoleData = {
      name: data.name,
      color: data.color,
      description: data.description,
      permissions: data.permissions || [],
      teamId: teamId,
      type: "CUSTOM",
    };

    try {
      const role = await this.roleService.createRole(createRoleData);
      return this.organizationsRolesOutputService.getRoleOutput(role);
    } catch (error) {
      console.log(error);
      if (error instanceof Error && error.message.includes("already exists")) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  async getRole(teamId: number, roleId: string) {
    const role = await this.roleService.getRole(roleId);

    if (!role || role.teamId !== teamId) {
      throw new NotFoundException(`Role with id ${roleId} within team id ${teamId} not found`);
    }

    return this.organizationsRolesOutputService.getRoleOutput(role);
  }

  async getTeamRoles(teamId: number, skip = 0, take = 250) {
    const allRoles = await this.roleService.getTeamRoles(teamId);

    const paginatedRoles = allRoles.slice(skip, skip + take);

    return this.organizationsRolesOutputService.getRolesOutput(paginatedRoles);
  }

  async updateRole(teamId: number, roleId: string, data: UpdateRoleInput) {
    const belongsToTeam = await this.roleService.roleBelongsToTeam(roleId, teamId);
    if (!belongsToTeam) {
      throw new NotFoundException(`Role with id ${roleId} within team id ${teamId} not found`);
    }

    const updateData: UpdateRolePermissionsData = {
      roleId,
      permissions: data.permissions || [],
      updates: {
        name: data.name,
        color: data.color,
      },
    };

    try {
      const updatedRole = await this.roleService.update(updateData);
      return this.organizationsRolesOutputService.getRoleOutput(updatedRole);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("Role not found")) {
          throw new NotFoundException(error.message);
        }
        if (error.message.includes("Cannot update default roles")) {
          throw new BadRequestException(error.message);
        }
        if (error.message.includes("Invalid permissions provided")) {
          throw new BadRequestException(error.message);
        }
      }
      throw error;
    }
  }

  async deleteRole(teamId: number, roleId: string) {
    const belongsToTeam = await this.roleService.roleBelongsToTeam(roleId, teamId);
    if (!belongsToTeam) {
      throw new NotFoundException(`Role with id ${roleId} within team id ${teamId} not found`);
    }

    const role = await this.roleService.getRole(roleId);
    if (!role) {
      throw new NotFoundException(`Role with id ${roleId} within team id ${teamId} not found`);
    }

    try {
      await this.roleService.deleteRole(roleId);
      return this.organizationsRolesOutputService.getRoleOutput(role);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("Cannot delete default roles")) {
          throw new BadRequestException(error.message);
        }
      }
      throw error;
    }
  }
}
