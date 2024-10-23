import { prisma } from "@calcom/prisma";

export class SelectedCalendarRepository {
  static async create({
    credentialId,
    userId,
    externalId,
    integration,
  }: {
    credentialId: number;
    userId: number;
    externalId: number;
    integration: string;
  }) {
    return await prisma.selectedCalendar.create({
      data: {
        credentialId,
        userId,
        externalId,
        integration,
      },
    });
  }
}
