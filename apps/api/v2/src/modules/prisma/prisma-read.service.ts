import type { OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@calcom/prisma/client";

@Injectable()
export class PrismaReadService implements OnModuleInit, OnModuleDestroy {
  private logger = new Logger("PrismaReadService");

  public prisma: PrismaClient;

  constructor(readonly configService: ConfigService) {
    const dbUrl = configService.get("db.readUrl", { infer: true });
    const adapter = new PrismaPg({ connectionString: dbUrl });
    this.prisma = new PrismaClient({
      adapter,
    });
  }

  async onModuleInit() {
    try {
      await this.prisma.$connect();
      this.logger.log("Connected to read database");
    } catch {
      this.logger.error("Database connection failed");
    }
  }

  async onModuleDestroy() {
    try {
      await this.prisma.$disconnect();
    } catch (error) {
      this.logger.error(error);
    }
  }
}
