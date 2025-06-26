import type { Prisma } from "@prisma/client";

import type { readonlyPrisma } from "@calcom/prisma";

export type InsightsBookingRepositoryOptions = {
  scope: "user" | "org" | "team";
  userId: number;
  orgId: number;
  teamId?: number;
};

export type InsightsBookingRepositoryFilterOptions = {
  eventTypeId?: number;
  memberUserId?: number;
};

export class InsightsBookingRepository {
  private prisma: typeof readonlyPrisma;

  constructor(prisma: typeof readonlyPrisma) {
    this.prisma = prisma;
  }

  async findMany(findManyArgs: Prisma.BookingTimeStatusDenormalizedFindManyArgs) {
    return this.prisma.bookingTimeStatusDenormalized.findMany(findManyArgs);
  }

  async findOrgMembership({
    userId,
    orgId,
    select = { id: true },
  }: {
    userId: number;
    orgId: number;
    select?: Prisma.MembershipSelect;
  }) {
    return this.prisma.membership.findUnique({
      where: {
        userId_teamId: {
          userId,
          teamId: orgId,
        },
        accepted: true,
        role: {
          in: ["OWNER", "ADMIN"],
        },
      },
      select,
    });
  }
}
