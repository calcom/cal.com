import type { PrismaClient } from "@calcom/prisma";

/**
 * Test-only repository for Team/Organization creation.
 * Used in integration tests where no production TeamRepository.create() exists.
 */
export class TestTeamRepository {
  constructor(private prismaClient: PrismaClient) {}

  async create(data: { name: string; slug: string; isOrganization?: boolean; parentId?: number }) {
    return this.prismaClient.team.create({
      data,
      select: { id: true },
    });
  }
}
