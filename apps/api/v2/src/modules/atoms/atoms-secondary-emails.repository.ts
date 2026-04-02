import { Injectable } from "@nestjs/common";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";

@Injectable()
export class AtomsSecondaryEmailsRepository {
  constructor(
    private readonly dbRead: PrismaReadService,
    private readonly dbWrite: PrismaWriteService
  ) {}

  async getSecondaryEmailsVerified(userId: number) {
    return await this.dbRead.prisma.secondaryEmail.findMany({
      where: {
        userId,
        emailVerified: {
          not: null,
        },
      },
    });
  }

  async getExistingSecondaryEmailByUserAndEmail(userId: number, email: string) {
    const existingSecondaryEmailRecord = await this.dbRead.prisma.secondaryEmail.findUnique({
      where: {
        userId_email: { userId, email },
      },
    });

    return existingSecondaryEmailRecord?.email;
  }

  async getExistingSecondaryEmail(email: string) {
    const existingSecondaryEmailRecord = await this.dbRead.prisma.secondaryEmail.findUnique({
      where: {
        email,
      },
    });

    return existingSecondaryEmailRecord?.email;
  }

  async addSecondaryEmailVerified(userId: number, email: string) {
    const existingSecondaryEmailRecord = await this.dbWrite.prisma.secondaryEmail.create({
      data: {
        userId,
        email,
        emailVerified: new Date(),
      },
    });

    return existingSecondaryEmailRecord?.email;
  }
}
