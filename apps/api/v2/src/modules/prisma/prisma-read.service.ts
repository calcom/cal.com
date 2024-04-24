import type { OnModuleInit } from "@nestjs/common";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaReadService implements OnModuleInit {
  public prisma: PrismaClient;

  constructor(readonly configService: ConfigService) {
    const dbUrl = configService.get("db.readUrl", { infer: true });

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
}
