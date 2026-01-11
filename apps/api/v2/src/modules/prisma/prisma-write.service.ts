import { OnModuleDestroy, OnModuleInit, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { PrismaClient } from "@calcom/prisma/client";

const DB_MAX_POOL_CONNECTION = 5;

export interface PrismaServiceOptions {
  writeUrl?: string;
  maxWriteConnections?: number;
  e2e?: boolean;
  type: "main" | "worker";
}

@Injectable()
export class PrismaWriteService implements OnModuleInit, OnModuleDestroy {
  private logger = new Logger("PrismaWriteService");
  public prisma!: PrismaClient;
  private pool!: Pool;
  private options!: PrismaServiceOptions;

  constructor(private configService?: ConfigService) {
    if (configService) {
      const writeUrl = configService.get<string>("db.writeUrl", { infer: true });
      const poolMax = parseInt(
        configService.get<number>("db.writePoolMax", { infer: true }) ?? DB_MAX_POOL_CONNECTION
      );
      const e2e = configService.get<boolean>("e2e", { infer: true }) ?? false;

      this.setOptions({
        writeUrl,
        maxWriteConnections: poolMax,
        e2e,
        type: "main",
      });
    }
  }

  setOptions(options: PrismaServiceOptions) {
    this.options = options;

    const dbUrl = options.writeUrl;
    const isE2E = options.e2e ?? false;
    this.pool = new Pool({
      connectionString: dbUrl,
      max: isE2E ? 1 : options.maxWriteConnections ?? DB_MAX_POOL_CONNECTION,
      idleTimeoutMillis: 300000,
    });

    const adapter = new PrismaPg(this.pool);
    this.prisma = new PrismaClient({ adapter });
  }

  async onModuleInit() {
    if (!this.prisma) return;

    try {
      await this.prisma.$connect();
      this.logger.log("Connected to write database");
    } catch (error) {
      this.logger.error("Database connection failed", error);
    }
  }

  async onModuleDestroy() {
    try {
      if (this.prisma) await this.prisma.$disconnect();
      if (this.pool) await this.pool.end();
    } catch (error) {
      this.logger.error("Error disconnecting from write database", error);
    }
  }
}
