import { Injectable } from "@nestjs/common";

@Injectable()
export class DestinationCalendarsRepository {
  // TODO: PrismaWriteService
  async updateCalendar(
    integration: string,
    externalId: string,
    credentialId: number,
    userId: number,
    primaryEmail: string | null
  ) {
    //   return await this.dbWrite.prisma.destinationCalendar.upsert({
    //     update: {
    //       integration,
    //       externalId,
    //       credentialId,
    //       primaryEmail,
    //     },
    //     create: {
    //       integration,
    //       externalId,
    //       credentialId,
    //       primaryEmail,
    //       userId,
    //     },
    //     where: {
    //       userId: userId,
    //     },
    //   });
  }
}
