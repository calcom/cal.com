import { OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { PrismaClient } from "@calcom/prisma/client";

@Injectable()
export class PrismaWriteService implements OnModuleInit, OnModuleDestroy {
  private logger = new Logger("PrismaWriteService");

  public prisma: PrismaClient;
  private pool: Pool;

  constructor(readonly configService: ConfigService) {
    const dbUrl = configService.get("db.writeUrl", { infer: true });
    this.pool = new Pool({ connectionString: dbUrl, max: 1 });
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
