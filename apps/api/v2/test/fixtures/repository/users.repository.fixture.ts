import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { TestingModule } from "@nestjs/testing";
import { Prisma, User } from "@prisma/client";

export class UserRepositoryFixture {
  private primaReadClient: PrismaReadService["prisma"];
  private prismaWriteClient: PrismaWriteService["prisma"];

  constructor(private readonly module: TestingModule) {
    this.primaReadClient = module.get(PrismaReadService).prisma;
    this.prismaWriteClient = module.get(PrismaWriteService).prisma;
  }

  async get(userId: User["id"]) {
    return this.primaReadClient.user.findFirst({ where: { id: userId } });
  }

  async create(data: Prisma.UserCreateInput) {
    try {
      // avoid uniq constraint in tests
      await this.deleteByEmail(data.email);
    } catch {}

    return this.prismaWriteClient.user.create({ data });
  }

  async createOAuthManagedUser(email: Prisma.UserCreateInput["email"], oAuthClientId: string) {
    try {
      // avoid uniq constraint in tests
      await this.deleteByEmail(email);
    } catch {}

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
}
