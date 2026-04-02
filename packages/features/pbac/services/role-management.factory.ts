import { FeaturesRepository } from "@calcom/features/flags/features.repository";
import { prisma } from "@calcom/prisma";
import { LegacyRoleManager } from "./legacy-role-manager.service";
import { PBACRoleManager } from "./pbac-role-manager.service";
import { PermissionCheckService } from "./permission-check.service";
import { RoleService } from "./role.service";
import type { IRoleManager } from "./role-manager.interface";

export class RoleManagementFactory {
  private static instance: RoleManagementFactory;
  private featuresRepository: FeaturesRepository;
  private roleService: RoleService;
  private permissionCheckService: PermissionCheckService;

  private constructor() {
    // Not used but needed for DI
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    (this.featuresRepository = new FeaturesRepository(prisma)), (this.roleService = new RoleService());
    this.permissionCheckService = new PermissionCheckService();
  }

  public static getInstance(): RoleManagementFactory {
    if (!RoleManagementFactory.instance) {
      RoleManagementFactory.instance = new RoleManagementFactory();
    }
    return RoleManagementFactory.instance;
  }

  async createRoleManager(organizationId: number): Promise<IRoleManager> {
    const isPBACEnabled = await this.featuresRepository.checkIfTeamHasFeature(organizationId, "pbac");

    return isPBACEnabled
      ? new PBACRoleManager(this.roleService, this.permissionCheckService)
      : new LegacyRoleManager();
  }
}
