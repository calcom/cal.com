import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

// It ensures that we work on userLevel calendars only
const propsEnsuringUserLevelCalendar = {
  eventTypeId: null,
};

@Injectable()
export class SelectedCalendarsRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async upsertSelectedCalendar(
    externalId: string,
    credentialId: number,
    userId: number,
    integration: string
  ) {
    // Unique constraint on userId_externalId_integration_eventTypeId is not usable so, we are unable to use upsert at the moment.
    const existingUserSelectedCalendar = await this.getUserSelectedCalendar(userId, integration, externalId);
    const data = {
      userId,
      externalId,
      credentialId,
      integration,
      ...propsEnsuringUserLevelCalendar,
    };

    if (existingUserSelectedCalendar) {
      return this.dbWrite.prisma.selectedCalendar.update({
        where: {
          id: existingUserSelectedCalendar.id,
        },
        data,
      });
    }

    return this.dbWrite.prisma.selectedCalendar.create({
      data,
    });
  }

  getUserSelectedCalendars(userId: number) {
    return this.dbRead.prisma.selectedCalendar.findMany({
      where: {
        userId,
        ...propsEnsuringUserLevelCalendar,
      },
    });
  }

  getUserSelectedCalendar(userId: number, integration: string, externalId: string) {
    return this.dbRead.prisma.selectedCalendar.findFirst({
      where: {
        userId,
        externalId,
        integration,
        ...propsEnsuringUserLevelCalendar,
      },
    });
  }

  async addUserSelectedCalendar(
    userId: number,
    integration: string,
    externalId: string,
    credentialId: number
  ) {
    const existingUserSelectedCalendar = await this.getUserSelectedCalendar(userId, integration, externalId);

    if (existingUserSelectedCalendar) {
      return;
    }

    return await this.dbWrite.prisma.selectedCalendar.create({
      data: {
        userId,
        integration,
        externalId,
        credentialId,
        ...propsEnsuringUserLevelCalendar,
      },
    });
  }

  async removeUserSelectedCalendar(userId: number, integration: string, externalId: string) {
    // Using deleteMany because userId_externalId_integration_eventTypeId is a unique constraint but with eventTypeId being nullable, causing it to be not used as a unique constraint
    return await this.dbWrite.prisma.selectedCalendar.deleteMany({
      where: {
        userId,
        externalId,
        integration,
        ...propsEnsuringUserLevelCalendar,
      },
    });
  }
}
