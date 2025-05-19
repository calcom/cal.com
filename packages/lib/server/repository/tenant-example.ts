import type { PrismaClient } from "@prisma/client";

import { createTenantRepository } from "./repositoryFactory";

export class TenantExampleRepository {
  constructor(private prisma: PrismaClient) {}

  async getUserCount() {
    return await this.prisma.user.count();
  }

  async getTeamCount() {
    return await this.prisma.team.count();
  }
}

export async function getTenantStats(host: string) {
  const repo = await createTenantRepository(TenantExampleRepository, host);

  return {
    users: await repo.getUserCount(),
    teams: await repo.getTeamCount(),
  };
}
