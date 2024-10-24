import { prisma } from "@calcom/prisma";

export class SelectedCalendarRepository {
  static async create(data: {
    credentialId: number;
    userId: number;
    externalId: string;
    integration: string;
  }) {
    return await prisma.selectedCalendar.create({
      data,
    });
  }
}
