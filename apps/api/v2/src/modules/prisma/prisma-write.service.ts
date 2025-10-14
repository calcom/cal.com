import { OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@calcom/prisma/client";

@Injectable()
export class PrismaWriteService implements OnModuleInit, OnModuleDestroy {
  private logger = new Logger("PrismaWriteService");

  public prisma: PrismaClient;

  constructor(readonly configService: ConfigService) {
    const dbUrl = configService.get("db.writeUrl", { infer: true });
    const adapter = new PrismaPg({ connectionString: dbUrl });

    this.prisma = new PrismaClient({
      adapter,
    });
  }

  async onModuleInit() {
    this.prisma.$connect();
  }

  async onModuleDestroy() {
    try {
      await this.prisma.$disconnect();
    } catch (error) {
      this.logger.error(error);
    }
  }
}
