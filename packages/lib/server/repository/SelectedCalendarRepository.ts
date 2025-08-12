import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

export interface ISelectedCalendarRepository {
  findFirst(args: { where: Prisma.SelectedCalendarWhereInput }): Promise<{ id: string } | null>;
  findMany(args: { where: Prisma.SelectedCalendarWhereInput }): Promise<Array<{ id: string }>>;
}

export class SelectedCalendarRepository implements ISelectedCalendarRepository {
  constructor(private prismaClient: PrismaClient) {}
  async findFirst(args: { where: Prisma.SelectedCalendarWhereInput }): Promise<{ id: string } | null> {
    return this.prismaClient.selectedCalendar.findFirst({
      where: args.where,
      select: { id: true },
    });
  }

  async findMany(args: { where: Prisma.SelectedCalendarWhereInput }): Promise<Array<{ id: string }>> {
    return this.prismaClient.selectedCalendar.findMany({
      where: args.where,
      select: { id: true },
    });
  }
}
