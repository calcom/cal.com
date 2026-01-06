import { prisma } from "@calcom/prisma";

export class DestinationCalendarRepository {
  static async getCustomReminderByCredentialId(credentialId: number): Promise<number | null> {
    const destinationCalendar = await prisma.destinationCalendar.findFirst({
      where: { credentialId },
      select: { customCalendarReminder: true },
    });
    return destinationCalendar?.customCalendarReminder ?? null;
  }

  static async updateCustomReminder({
    userId,
    credentialId,
    integration,
    customCalendarReminder,
  }: {
    userId: number;
    credentialId: number;
    integration: string;
    customCalendarReminder: number | null;
  }) {
    return await prisma.destinationCalendar.updateMany({
      where: {
        userId,
        credentialId,
        integration,
      },
      data: {
        customCalendarReminder,
      },
    });
  }
}
