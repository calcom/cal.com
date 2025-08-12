import type { Prisma } from "@prisma/client";

export interface ISelectedCalendarRepository {
  findFirst(args: { where: Prisma.SelectedCalendarWhereInput }): Promise<{ id: string } | null>;
  findMany(args: { where: Prisma.SelectedCalendarWhereInput }): Promise<Array<{ id: string }>>;
}

export class SelectedCalendarRepository implements ISelectedCalendarRepository {
  constructor(private prismaClient: PrismaClient) {}
  async findFirst(args: { where: Prisma.SelectedCalendarWhereInput }): Promise<{ id: string } | null> {
    const result = await this.prismaClient.selectedCalendar.findFirst(args);
    return result ? { id: result.id } : null;
  }

  async findMany(args: { where: Prisma.SelectedCalendarWhereInput }): Promise<Array<{ id: string }>> {
    const results = await this.prismaClient.selectedCalendar.findMany(args);
    return results.map((r) => ({ id: r.id }));
  }
}
