import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

export class SelectedCalendarRepository {
  constructor(private prismaClient: PrismaClient) {}
  async findFirst(args: { where: Prisma.SelectedCalendarWhereInput }) {
    return this.prismaClient.selectedCalendar.findFirst({
      where: args.where,
      select: { id: true, externalId: true, credentialId: true },
    });
  }

  async findMany(args: { where: Prisma.SelectedCalendarWhereInput }) {
    return this.prismaClient.selectedCalendar.findMany({
      where: args.where,
      select: { id: true, externalId: true, credentialId: true },
    });
  }
}
