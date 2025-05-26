import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

// It ensures that we work on userLevel calendars only
const ensureUserLevelWhere = {
  eventTypeId: null,
};

export const NO_SELECTED_CALENDAR_FOUND = "No SelectedCalendar found.";
export const MULTIPLE_SELECTED_CALENDARS_FOUND = "Multiple SelecteCalendars found. Skipping deletion";

@Injectable()
export class SelectedCalendarsRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async upsertSelectedCalendar(
    externalId: string,
    credentialId: number,
    userId: number,
    integration: string
  ) {
    // Why we can't use .upsert here, see server/repository/selectedCalendar.ts#upsert
    const existingUserSelectedCalendar = await this.getUserSelectedCalendar(userId, integration, externalId);
    const data = {
      userId,
      externalId,
      credentialId,
      integration,
      ...ensureUserLevelWhere,
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
    // It would be unique result but we can't use .findUnique here because of eventTypeId being nullable
    return this.dbRead.prisma.selectedCalendar.findMany({
      where: {
        userId,
        ...ensureUserLevelWhere,
      },
    });
  }

  getUserSelectedCalendar(userId: number, integration: string, externalId: string) {
    return this.dbRead.prisma.selectedCalendar.findFirst({
      where: {
        userId,
        externalId,
        integration,
        ...ensureUserLevelWhere,
      },
    });
  }

  getUserEventTypeSelectedCalendar(userId: number) {
    return this.dbRead.prisma.selectedCalendar.findMany({
      where: {
        userId,
        eventTypeId: { not: null },
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
        ...ensureUserLevelWhere,
      },
    });
  }

  async removeUserSelectedCalendar(
    userId: number,
    integration: string,
    externalId: string,
    delegationCredentialId?: string
  ) {
    // Using deleteMany because userId_externalId_integration_eventTypeId is a unique constraint but with eventTypeId being nullable, causing it to be not used as a unique constraint
    const records = await this.dbWrite.prisma.selectedCalendar.findMany({
      where: {
        userId,
        externalId,
        integration,
        delegationCredentialId,
        ...ensureUserLevelWhere,
      },
    });

    // Make the behaviour same as .delete which throws error if no record is found
    if (records.length === 0) {
      throw new Error(NO_SELECTED_CALENDAR_FOUND);
    }

    if (records.length > 1) {
      throw new Error(MULTIPLE_SELECTED_CALENDARS_FOUND);
    }

    return await this.dbWrite.prisma.selectedCalendar.delete({
      where: {
        id: records[0].id,
      },
    });
  }
}
