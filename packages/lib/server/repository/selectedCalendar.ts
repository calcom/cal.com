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
}
