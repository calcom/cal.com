import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

@Injectable()
export class DestinationCalendarsRepository {
  constructor(private readonly dbWrite: PrismaWriteService) {}

  async updateCalendar(
    integration: string,
    externalId: string,
    credentialId: number,
    userId: number,
    primaryEmail: string | null
  ) {
    return await await this.dbWrite.prisma.destinationCalendar.upsert({
      where: {
        userId: userId,
      },
      update: {
        integration,
        externalId,
        credentialId,
        primaryEmail,
      },
      create: {
        userId: userId,
        integration,
        externalId,
        credentialId,
        primaryEmail,
      },
    });
  }
}
