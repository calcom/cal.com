import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

import type { ISelectedCalendarRepository } from "./SelectedCalendarRepository.interface";

export class SelectedCalendarRepository implements ISelectedCalendarRepository {
  constructor(private prismaClient: PrismaClient) {}

  async findById(id: string) {
    return this.prismaClient.selectedCalendar.findUnique({
      where: { id },
      include: {
        credential: {
          select: {
            delegationCredential: true,
          },
        },
      },
    });
  }

  async findNotSubscribed({ take }: { take: number }) {
    return this.prismaClient.selectedCalendar.findMany({
      where: { syncSubscribedAt: null },
      take,
    });
  }

  async findMany(args: { where: Prisma.SelectedCalendarWhereInput }) {
    return this.prismaClient.selectedCalendar.findMany({
      where: args.where,
      select: { id: true, externalId: true, credentialId: true, syncedAt: true },
    });
  }

  async findByChannelId(channelId: string) {
    return this.prismaClient.selectedCalendar.findFirst({ where: { channelId } });
  }

  async updateById(id: string, data: Prisma.SelectedCalendarUpdateInput) {
    return this.prismaClient.selectedCalendar.update({
      where: { id },
      data,
    });
  }
}
