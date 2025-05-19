import { Injectable, Scope } from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { REQUEST } from "@nestjs/core";
import { PrismaClient } from "@prisma/client";

import { getTenantFromHost } from "@calcom/prisma/store/tenants";

@Injectable({ scope: Scope.REQUEST })
export class TenantAwarePrismaService {
  public prisma: PrismaClient;

  constructor(
    @Inject(REQUEST) private readonly request: Request,
    private readonly configService: ConfigService
  ) {
    const host = this.request.headers["host"] || "";
    const tenant = getTenantFromHost(host);

    let dbUrl = this.configService.get("db.url", { infer: true });
    if (tenant === "eu") {
      dbUrl = this.configService.get("db.euUrl", { infer: true });
    }

    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: dbUrl,
        },
      },
    });
  }
}
