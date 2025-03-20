import { Injectable } from "@nestjs/common";

import { PrismaWriteService } from "../prisma/prisma-write.service";

@Injectable()
export class DestinationCalendarsRepository {
  constructor(private readonly dbWrite: PrismaWriteService) {}

  async updateCalendar(
    integration: string,
    externalId: string,

    userId: number,
    primaryEmail: string | null,
    credentialId?: number,
    delegationCredentialId?: string
  ) {
    return await this.dbWrite.prisma.destinationCalendar.upsert({
      update: {
        integration,
        externalId,
        ...(credentialId ? { credentialId } : {}),
        ...(delegationCredentialId ? { delegationCredentialId } : {}),
        primaryEmail,
      },
      create: {
        integration,
        externalId,
        ...(credentialId ? { credentialId } : {}),
        ...(delegationCredentialId ? { delegationCredentialId } : {}),
        primaryEmail,
        userId,
      },
      where: {
        userId: userId,
      },
    });
  }
}
