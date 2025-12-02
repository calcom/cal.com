import type { PrismaClient } from "@calcom/prisma";

export class MembershipRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async findUserTeamMembershipsWithLockStatus({ userId }: { userId: number }) {
    const memberships = await this.prismaClient.membership.findMany({
      where: {
        userId,
        accepted: true,
      },
      select: {
        team: {
          select: {
            lockDefaultAvailability: true,
          },
        },
        role: true,
      },
    });

    return memberships.map((membership) => ({
      team: {
        lockDefaultAvailability: membership.team.lockDefaultAvailability,
      },
      role: membership.role,
    }));
  }
}
