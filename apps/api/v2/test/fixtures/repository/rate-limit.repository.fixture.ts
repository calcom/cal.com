import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { TestingModule } from "@nestjs/testing";

export class RateLimitRepositoryFixture {
  private dbWrite: PrismaWriteService["prisma"];

  constructor(private readonly module: TestingModule) {
    this.dbWrite = module.get(PrismaWriteService).prisma;
  }

  async createRateLimit(name: string, apiKeyId: string, ttl: number, limit: number, blockDuration: number) {
    return await this.dbWrite.rateLimit.create({
      data: {
        name,
        apiKeyId,
        ttl,
        limit,
        blockDuration,
      },
    });
  }
}
