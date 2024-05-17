import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

@Injectable()
export class SelectedCalendarsRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  createSelectedCalendar(externalId: string, credentialId: number, userId: number, integration: string) {
    return this.dbWrite.prisma.selectedCalendar.upsert({
      create: {
        userId,
        externalId,
        credentialId,
        integration,
      },
      update: {
        userId,
        externalId,
        credentialId,
        integration,
      },
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
}
