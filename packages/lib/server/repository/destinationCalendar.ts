import type { PrismaClient } from "@calcom/prisma";

export class DestinationCalendarRepository {
  constructor(private prisma: PrismaClient) {}

  async getCustomReminderByCredentialId(credentialId: number): Promise<number | null> {
    const destinationCalendar = await this.prisma.destinationCalendar.findFirst({
      where: { credentialId },
      select: { customCalendarReminder: true },
    });
    return destinationCalendar?.customCalendarReminder ?? null;
  }

  async updateCustomReminder({
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
    return await this.prisma.destinationCalendar.updateMany({
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
