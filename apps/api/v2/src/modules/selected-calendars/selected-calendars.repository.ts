import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

@Injectable()
export class SelectedCalendarsRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  upsertSelectedCalendar(
    externalId: string,
    credentialId: number,
    userId: number,
    integration: string,
    defaultReminder?: number
  ) {
    const data: {
      userId: number;
      externalId: string;
      credentialId: number;
      integration: string;
      defaultReminder?: number;
    } = {
      userId,
      externalId,
      credentialId,
      integration,
    };

    if (!defaultReminder) {
      data.defaultReminder = defaultReminder;
    }

    return this.dbWrite.prisma.selectedCalendar.upsert({
      create: data,
      update: data,
      where: {
        userId_integration_externalId: {
          userId,
          integration,
          externalId,
        },
      },
    });
  }

  getUserSelectedCalendars(userId: number) {
    return this.dbRead.prisma.selectedCalendar.findMany({
      where: {
        userId,
      },
    });
  }

  getUserSelectedCalendar(userId: number, integration: string, externalId: string) {
    return this.dbRead.prisma.selectedCalendar.findUnique({
      where: {
        userId_integration_externalId: {
          userId,
          externalId,
          integration,
        },
      },
    });
  }

  async addUserSelectedCalendar(
    userId: number,
    integration: string,
    externalId: string,
    credentialId: number,
    defaultReminder?: number
  ) {
    const data: {
      userId: number;
      externalId: string;
      credentialId: number;
      integration: string;
      defaultReminder?: number;
    } = {
      userId,
      integration,
      externalId,
      credentialId,
    };
    if (defaultReminder) {
      data.defaultReminder = defaultReminder;
    }
    return await this.dbWrite.prisma.selectedCalendar.upsert({
      where: {
        userId_integration_externalId: {
          userId,
          integration,
          externalId,
        },
      },
      create: data,
      // already exists
      update: data,
    });
  }

  async removeUserSelectedCalendar(userId: number, integration: string, externalId: string) {
    return await this.dbWrite.prisma.selectedCalendar.delete({
      where: {
        userId_integration_externalId: {
          userId,
          externalId,
          integration,
        },
      },
    });
  }
}
