import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { TestingModule } from "@nestjs/testing";
import { randomBytes, createHash } from "crypto";

export class ApiKeysRepositoryFixture {
  private primaReadClient: PrismaReadService["prisma"];
  private prismaWriteClient: PrismaWriteService["prisma"];

  constructor(private readonly module: TestingModule) {
    this.primaReadClient = module.get(PrismaReadService).prisma;
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
}
