import type { PrismaClient } from "@calcom/prisma";
import type { SelectedCalendar } from "@calcom/types/Calendar";

import type { ISelectedCalendarRepository } from "./SelectedCalendarRepository.interface";

export class SelectedCalendarRepository implements ISelectedCalendarRepository {
  constructor(private prisma: PrismaClient) {}

  async findManyBySelectedCalendars(selectedCalendars: SelectedCalendar[]) {
    const result = await this.prisma.selectedCalendar.findMany({
      where: {
        OR: selectedCalendars.map((sc) => ({
          userId: sc.userId,
          integration: sc.integration,
          externalId: sc.externalId,
          credentialId: sc.credentialId,
        })),
      },
      select: {
        id: true,
        userId: true,
        integration: true,
        externalId: true,
        credentialId: true,
      },
    });

    return result.map((item) => ({
      id: item.id,
      userId: item.userId,
      integration: item.integration,
      externalId: item.externalId,
      credentialId: item.credentialId,
    }));
  }
}
