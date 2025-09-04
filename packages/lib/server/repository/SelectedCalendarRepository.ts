import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

export class SelectedCalendarRepository {
  constructor(private prismaClient: PrismaClient) {}

  async findById(id: string) {
    return await this.prismaClient.selectedCalendar.findUnique({ where: { id } });
  }

  async updateById(id: string, data: Prisma.SelectedCalendarUpdateInput) {
    return await this.prismaClient.selectedCalendar.update({
      where: { id },
      data,
    });
  }
}
