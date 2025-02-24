import type { Prisma } from "@prisma/client";

import { prisma } from "@calcom/prisma";

export class DestinationCalendarRepository {
  static async create(data: Prisma.DestinationCalendarCreateInput) {
    return await prisma.destinationCalendar.create({
      data,
    });
  }

  static async getByUserId(userId: string) {
    return await prisma.destinationCalendar.findFirst({
      where: {
        userId,
      },
    });
  }

  static async getByEventTypeId(eventTypeId: number) {
    return await prisma.destinationCalendar.findFirst({
      where: {
        eventTypeId,
      },
    });
  }
}
