import type { PrismaTransaction, PrismaClient as PrismaClientWithExtensions } from "@calcom/prisma";

import type { Role, CreateRoleData } from "../models/Role";
import type { PermissionString } from "../types/permission-registry";

export interface IRoleRepository {
  findByName(name: string, teamId?: number): Promise<Role | null>;
  findById(id: string): Promise<Role | null>;
  findByTeamId(teamId: number): Promise<Role[]>;
  roleBelongsToTeam(roleId: string, teamId: number): Promise<boolean>;
  create(data: CreateRoleData): Promise<Role>;
  delete(id: string): Promise<void>;
  update(
    roleId: string,
    permissions: PermissionString[],
    updates?: {
      color?: string;
      name?: string;
      description?: string;
    }
  ): Promise<Role>;
  setTransaction(trx: PrismaClientWithExtensions | PrismaTransaction): void;
}
