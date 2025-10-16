import { OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { PrismaClient } from "@calcom/prisma/client";

const DB_MAX_POOL_CONNECTION = 10;

@Injectable()
export class PrismaWriteService implements OnModuleInit, OnModuleDestroy {
  private logger = new Logger("PrismaWriteService");

  public prisma: PrismaClient;
  private pool: Pool;

  constructor(readonly configService: ConfigService) {
    const dbUrl = configService.get("db.writeUrl", { infer: true });
    const isE2E = configService.get<boolean>("e2e", { infer: true }) ?? false;
    this.pool = new Pool({ connectionString: dbUrl, max: isE2E ? 1 : DB_MAX_POOL_CONNECTION });
    const adapter = new PrismaPg(this.pool);
    this.prisma = new PrismaClient({
      adapter,
    });
  }

  async onModuleInit() {
    try {
      await this.prisma.$connect();
      this.logger.log("Connected to write database");
    } catch {
      this.logger.error("Database connection failed");
    }
  }

  async onModuleDestroy() {
    try {
      await this.prisma.$disconnect();
      await this.pool.end();
    } catch (error) {
      this.logger.error(error);
    }
  }
}
