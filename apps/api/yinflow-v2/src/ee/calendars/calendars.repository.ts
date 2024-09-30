import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";

const credentialForCalendarRepositorySelect = Prisma.validator<Prisma.CredentialSelect>()({
  id: true,
  appId: true,
  type: true,
  userId: true,
  user: {
    select: {
      email: true,
    },
  },
  teamId: true,
  key: true,
  invalid: true,
});

@Injectable()
export class CalendarsRepository {
  // TODO: PrismaReadService
  async getCalendarCredentials(credentialId: number, userId: number) {
    // return await this.dbRead.prisma.credential.findFirst({
    //   where: {
    //     id: credentialId,
    //     userId,
    //   },
    //   select: {
    //     ...credentialForCalendarRepositorySelect,
    //     app: {
    //       select: {
    //         slug: true,
    //         categories: true,
    //         dirName: true,
    //       },
    //     },
    //   },
    // });
  }
  // TODO: PrismaWriteService
  async deleteCredentials(credentialId: number) {
    // return await this.dbWrite.prisma.credential.delete({
    //   where: {
    //     id: credentialId,
    //   },
    // });
  }
}
