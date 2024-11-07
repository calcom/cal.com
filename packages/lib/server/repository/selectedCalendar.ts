import type { Prisma } from "@prisma/client";

import { prisma } from "@calcom/prisma";

type SelectedCalendarCreateInput = {
  credentialId: number;
  userId: number;
  externalId: string;
  integration: string;
};

export class SelectedCalendarRepository {
  static async create(data: SelectedCalendarCreateInput) {
    return await prisma.selectedCalendar.create({
      data: {
        ...data,
      },
    });
  }
  static async upsert(data: Prisma.SelectedCalendarUncheckedCreateInput) {
    return await prisma.selectedCalendar.upsert({
      where: {
        userId_integration_externalId: {
          userId: data.userId,
          integration: data.integration,
          externalId: data.externalId,
        },
      },
      create: { ...data },
      update: { ...data },
    });
  }
}
