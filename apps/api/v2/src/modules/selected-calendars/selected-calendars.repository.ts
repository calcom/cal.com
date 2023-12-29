import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

@Injectable()
export class SelectedCalendarsRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  createSelectedCalendar(externalId: string, credentialId: number, userId: number, integration: string) {
    return this.dbWrite.prisma.selectedCalendar.create({
      data: {
        userId,
        externalId,
        credentialId,
        integration,
      },
    });
  }
}
