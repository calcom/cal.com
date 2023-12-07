import { hashAPIKey } from "@/lib/api-key";
import type { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { Injectable } from "@nestjs/common";
import type { Request } from "express";

@Injectable()
export class ApiKeyService {
  constructor(private readonly dbRead: PrismaReadService) {}

  async retrieveApiKey(request: Request) {
    const apiKey = request.get("Authorization")?.replace("Bearer ", "");

    if (!apiKey) {
      return null;
    }

    const hashedKey = hashAPIKey(apiKey.replace("cal_", ""));

    const apiKeyResult = await this.dbRead.prisma.apiKey.findUniqueOrThrow({
      where: {
        hashedKey,
      },
    });

    return apiKeyResult;
  }
}
