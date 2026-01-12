import { PrismaClient } from "@calcom/prisma/client";
import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const DB_MAX_POOL_CONNECTION = 10;

@Injectable()
export class PrismaReadService implements OnModuleInit, OnModuleDestroy {
  private logger = new Logger("PrismaReadService");

  public prisma!: PrismaClient;
  private pool!: Pool;

  constructor(configService?: ConfigService) {
    if (configService) {
      // Use ConfigService defaults
      const readUrl = configService.get<string>("db.readUrl", { infer: true });
      const poolMax = parseInt(
        configService.get<number>("db.readPoolMax", { infer: true }) ?? DB_MAX_POOL_CONNECTION,
        10
      );
      const e2e = configService.get<boolean>("e2e", { infer: true }) ?? false;
      const usePool = configService.get<boolean>("db.usePool", { infer: true }) ?? true;

      this.setOptions({
        readUrl,
        maxReadConnections: poolMax,
        e2e,
        usePool,
        type: "main",
      });
    }
  }

  setOptions(options: PrismaServiceOptions): void {
    const dbUrl = options.readUrl;
    const isE2E = options.e2e ?? false;
    const usePool = options.usePool ?? true;

    if (usePool) {
      let maxReadConnections = options.maxReadConnections ?? DB_MAX_POOL_CONNECTION;
      if (isE2E) {
        maxReadConnections = 1;
      }

      this.pool = new Pool({
        connectionString: dbUrl,
        max: maxReadConnections,
        idleTimeoutMillis: 300000,
      });

      const adapter = new PrismaPg(this.pool);
      this.prisma = new PrismaClient({ adapter });
    } else {
      const adapter = new PrismaPg({ connectionString: dbUrl });
      this.prisma = new PrismaClient({
        adapter,
      });
    }
  }

  async onModuleInit(): Promise<void> {
    if (!this.prisma) return;

    try {
      await this.prisma.$connect();
      this.logger.log("Connected to read database");
    } catch (error) {
      this.logger.error("Database connection failed", error);
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      if (this.prisma) await this.prisma.$disconnect();
      if (this.pool) await this.pool.end();
    } catch (error) {
      this.logger.error("Error disconnecting from read database", error);
    }
  }
}

export interface PrismaServiceOptions {
  readUrl?: string;
  maxReadConnections?: number;
  e2e?: boolean;
  usePool?: boolean;
  type: "main" | "worker";
}
