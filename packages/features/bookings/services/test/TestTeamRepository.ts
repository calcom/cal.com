import type { PrismaClient } from "@calcom/prisma";

/**
 * Test-only repository for creating teams within an organization.
 * No production TeamRepository.create() method exists; OrganizationRepository.create()
 * handles org creation but not sub-team creation.
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
