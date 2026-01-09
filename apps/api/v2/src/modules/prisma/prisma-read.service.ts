import type { OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { PrismaClient } from "@calcom/prisma/client";

const DB_MAX_POOL_CONNECTION = 10;

export interface PrismaServiceOptions {
  readUrl?: string;
  maxReadConnections?: number;
  e2e?: boolean;
  type: "main" | "worker";
}

@Injectable()
export class PrismaReadService implements OnModuleInit, OnModuleDestroy {
  private logger = new Logger("PrismaReadService");

  public prisma!: PrismaClient;
  private pool!: Pool;
  private options!: PrismaServiceOptions;

  constructor(private configService?: ConfigService) {
    if (configService) {
      // Use ConfigService defaults
      const readUrl = configService.get<string>("db.readUrl", { infer: true });
      const poolMax = parseInt(
        configService.get<number>("db.readPoolMax", { infer: true }) ?? DB_MAX_POOL_CONNECTION
      );
      const e2e = configService.get<boolean>("e2e", { infer: true }) ?? false;

      this.setOptions({
        readUrl,
        maxReadConnections: poolMax,
        e2e,
        type: "main",
      });
    }
  }

  setOptions(options: PrismaServiceOptions) {
    this.options = options;

    const dbUrl = options.readUrl;
    const isE2E = options.e2e ?? false;

    this.pool = new Pool({
      connectionString: dbUrl,
      max: isE2E ? 1 : options.maxReadConnections ?? DB_MAX_POOL_CONNECTION,
      idleTimeoutMillis: 300000,
    });

    const adapter = new PrismaPg(this.pool);
    this.prisma = new PrismaClient({ adapter });
  }

  async onModuleInit() {
    if (!this.prisma) return;

    try {
      await this.prisma.$connect();
      this.logger.log("Connected to read database");
    } catch (error) {
      this.logger.error("Database connection failed", error);
    }
  }

  async onModuleDestroy() {
    try {
      if (this.prisma) await this.prisma.$disconnect();
      if (this.pool) await this.pool.end();
    } catch (error) {
      this.logger.error("Error disconnecting from read database", error);
    }
  }
}
