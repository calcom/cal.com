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
  static async upsert(data: SelectedCalendarCreateInput) {
    return await prisma.selectedCalendar.upsert({
      where: {
        userId_integration_externalId: { ...data },
      },
      create: { ...data },
      update: { ...data },
    });
  }
}
