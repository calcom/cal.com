import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";

export class VerifiedResourcesRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async getUserVerifiedEmails(userId: number, skip = 0, take = 250) {
    return this.dbRead.prisma.verifiedEmail.findMany({
      where: {
        userId,
      },
      skip,
      take,
    });
  }

  async getUserVerifiedPhoneNumbers(userId: number, skip = 0, take = 250) {
    return this.dbRead.prisma.verifiedNumber.findMany({
      where: {
        userId,
      },
      skip,
      take,
    });
  }

  async getTeamVerifiedEmails(teamId: number, skip = 0, take = 250) {
    return this.dbRead.prisma.verifiedEmail.findMany({
      where: {
        teamId,
      },
      skip,
      take,
    });
  }

  async getTeamVerifiedPhoneNumbers(teamId: number, skip = 0, take = 250) {
    return this.dbRead.prisma.verifiedNumber.findMany({
      where: {
        teamId,
      },
      skip,
      take,
    });
  }

  async getVerifiedEmail(userId: number, email: string, teamId?: number) {
    return this.dbRead.prisma.verifiedEmail.findFirstOrThrow({
      where: {
        userId,
        email,
        teamId,
      },
    });
  }

  async getVerifiedPhoneNumber(userId: number, phone: string, teamId?: number) {
    return this.dbRead.prisma.verifiedNumber.findFirstOrThrow({
      where: {
        userId,
        phoneNumber: phone,
        teamId,
      },
    });
  }

  async getTeamVerifiedEmailById(id: number, teamId?: number) {
    return this.dbRead.prisma.verifiedEmail.findFirst({
      where: {
        id,
        teamId,
      },
    });
  }

  async getTeamVerifiedPhoneNumberById(id: number, teamId?: number) {
    return this.dbRead.prisma.verifiedNumber.findFirst({
      where: {
        id,
        teamId,
      },
    });
  }

  async getUserVerifiedEmailById(userId: number, id: number) {
    return this.dbRead.prisma.verifiedEmail.findFirst({
      where: {
        userId,
        id,
      },
    });
  }

  async getUserVerifiedPhoneNumberById(userId: number, id: number) {
    return this.dbRead.prisma.verifiedNumber.findFirst({
      where: {
        userId,
        id,
      },
    });
  }
}
