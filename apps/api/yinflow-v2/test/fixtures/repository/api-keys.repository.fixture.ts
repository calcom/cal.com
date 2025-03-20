import { TestingModule } from "@nestjs/testing";
import { randomBytes, createHash } from "crypto";

import { PrismaReadService } from "../../../src/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "../../../src/modules/prisma/prisma-write.service";

export class ApiKeysRepositoryFixture {
  private prismaReadClient: PrismaReadService["prisma"];
  private prismaWriteClient: PrismaWriteService["prisma"];

  constructor(private readonly module: TestingModule) {
    this.prismaReadClient = module.get(PrismaReadService).prisma;
    this.prismaWriteClient = module.get(PrismaWriteService).prisma;
  }

  async createApiKey(userId: number, expiresAt: Date | null, teamId?: number) {
    const keyString = randomBytes(16).toString("hex");
    const apiKey = await this.prismaWriteClient.apiKey.create({
      data: {
        userId,
        teamId,
        hashedKey: createHash("sha256").update(keyString).digest("hex"),
        expiresAt: expiresAt,
      },
    });

    return { apiKey, keyString };
  }

  async getTeamApiKeys(teamId: number) {
    return await this.prismaReadClient.apiKey.findMany({
      where: {
        teamId,
      },
    });
  }
}
