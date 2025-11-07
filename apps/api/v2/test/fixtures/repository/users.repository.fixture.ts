import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { TestingModule } from "@nestjs/testing";

import type { Prisma, User } from "@calcom/prisma/client";

export class UserRepositoryFixture {
  private prismaReadClient: PrismaReadService["prisma"];
  private prismaWriteClient: PrismaWriteService["prisma"];

  constructor(module: TestingModule) {
    this.prismaReadClient = module.get(PrismaReadService).prisma;
    this.prismaWriteClient = module.get(PrismaWriteService).prisma;
  }

  async get(userId: User["id"]) {
    return this.prismaReadClient.user.findFirst({ where: { id: userId } });
  }

  async create(data: Prisma.UserCreateInput) {
    try {
      await this.deleteByEmail(data.email);
    } catch (_e) {
      void _e;
    }

    return this.prismaWriteClient.user.create({ data });
  }

  async createOAuthManagedUser(email: Prisma.UserCreateInput["email"], oAuthClientId: string) {
    try {
      await this.deleteByEmail(email);
    } catch (_e) {
      void _e;
    }

    return this.prismaWriteClient.user.create({
      data: {
        email,
        platformOAuthClients: {
          connect: { id: oAuthClientId },
        },
      },
    });
  }

  async delete(userId: User["id"]) {
    return this.prismaWriteClient.user.delete({ where: { id: userId } });
  }

  async deleteByEmail(email: User["email"]) {
    return this.prismaWriteClient.user.delete({ where: { email } });
  }

  async createSecondaryEmail(userId: User["id"], email: string, emailVerified: Date | null) {
    return this.prismaWriteClient.secondaryEmail.create({
      data: {
        userId,
        email,
        emailVerified,
      },
    });
  }
}
