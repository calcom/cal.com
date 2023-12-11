import { hashAPIKey } from "@/lib/api-key";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import type { Response } from "@/types";
import { Injectable } from "@nestjs/common";
import type { Request } from "express";

type ApiKeyInfo = {
  hashedKey: string;
  id: string;
  userId: number;
  teamId: number;
};

@Injectable()
export class ApiKeyService {
  constructor(private readonly dbRead: PrismaReadService) {}

  private setResponseApiKey = (response: Response, key: ApiKeyInfo) => {
    response.locals.apiKey = key;
  };

  getApiKeyFromRequest(request: Request): string | null {
    const apiKey = request.get("Authorization")?.replace("Bearer ", "");
    return apiKey;
  }

  async retrieveApiKey(request: Request, response?: Response) {
    const apiKey = request.get("Authorization")?.replace("Bearer ", "");
    const hashedKey = hashAPIKey(apiKey.replace("cal_", ""));

    const apiKeyResult = await this.dbRead.prisma.apiKey.findUnique({
      where: {
        hashedKey,
      },
    });

    if (response) {
      void this.setResponseApiKey(response, apiKeyResult);
    }

    return apiKeyResult;
  }
}
