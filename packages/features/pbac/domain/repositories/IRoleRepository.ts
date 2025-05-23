import type { Transaction } from "kysely";

import type { DB } from "@calcom/kysely";

import type { Role, CreateRoleData } from "../models/Role";
import type { PermissionString } from "../types/permission-registry";

export interface IRoleRepository {
  findByName(name: string, teamId?: number): Promise<Role | null>;
  findById(id: string): Promise<Role | null>;
  findByTeamId(teamId: number): Promise<Role[]>;
  create(data: CreateRoleData): Promise<Role>;
  delete(id: string): Promise<void>;
  updatePermissions(roleId: string, permissions: PermissionString[]): Promise<Role>;
  transaction<T>(callback: (repository: IRoleRepository, trx: Transaction<DB>) => Promise<T>): Promise<T>;
}
