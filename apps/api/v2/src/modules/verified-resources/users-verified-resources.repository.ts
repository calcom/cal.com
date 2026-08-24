import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

@Injectable()
export class UsersVerifiedResourcesRepository {
  constructor(
    private readonly dbRead: PrismaReadService,
    private readonly dbWrite: PrismaWriteService
  ) {}

  async getUserVerifiedEmails(userId: number, skip = 0, take = 250) {
    return this.dbRead.prisma.verifiedEmail.findMany({
      where: {
        userId,
      },
      skip,
      take,
    });
  }

  async getUserVerifiedPhoneNumber(userId: number, phone: string) {
    return this.dbRead.prisma.verifiedNumber.findFirstOrThrow({
      where: {
        userId,
        phoneNumber: phone,
      },
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

  async getUserVerifiedEmail(userId: number, email: string) {
    return this.dbRead.prisma.verifiedEmail.findFirstOrThrow({
      where: {
        userId,
        email,
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
