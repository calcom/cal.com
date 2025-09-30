import { OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import { PrismaClient } from "../../../generated/prisma/client";

@Injectable()
export class PrismaWriteService implements OnModuleInit, OnModuleDestroy {
  private logger = new Logger("PrismaWriteService");

  public prisma: PrismaClient;

  constructor(readonly configService: ConfigService) {
    const dbUrl = configService.get("db.writeUrl", { infer: true });
    const pool = new Pool({ connectionString: dbUrl });
    const adapter = new PrismaPg(pool);

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
