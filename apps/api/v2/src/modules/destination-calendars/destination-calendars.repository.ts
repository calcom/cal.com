import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

@Injectable()
export class DestinationCalendarsRepository {
  constructor(private readonly dbWrite: PrismaWriteService) {}

  async updateCalendar(
    integration: string,
    externalId: string,

    userId: number,
    primaryEmail: string | null,
    credentialId?: number,
    domainWideDelegationCredentialId?: string
  ) {
    return await this.dbWrite.prisma.destinationCalendar.upsert({
      update: {
        integration,
        externalId,
        ...(credentialId ? { credentialId } : {}),
        ...(domainWideDelegationCredentialId ? { domainWideDelegationCredentialId } : {}),
        primaryEmail,
      },
      create: {
        integration,
        externalId,
        ...(credentialId ? { credentialId } : {}),
        ...(domainWideDelegationCredentialId ? { domainWideDelegationCredentialId } : {}),
        primaryEmail,
        userId,
      },
      where: {
        userId: userId,
      },
    });
  }
}
