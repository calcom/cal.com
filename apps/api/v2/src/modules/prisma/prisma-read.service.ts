import type { OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { Injectable, Logger } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

import { getEnv } from "../../env";

@Injectable()
export class PrismaReadService implements OnModuleInit, OnModuleDestroy {
  private logger = new Logger("PrismaReadService");

  public prisma: PrismaClient;

  constructor() {
    const dbUrl = getEnv("DATABASE_READ_URL");

    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: dbUrl,
        },
      },
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
