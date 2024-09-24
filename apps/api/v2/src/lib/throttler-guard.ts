import { isApiKey } from "@/lib/api-key";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModuleOptions, ThrottlerStorage } from "@nestjs/throttler";
import { Request } from "express";

import { X_CAL_CLIENT_ID } from "@calcom/platform-constants";

@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  private logger = new Logger("CustomThrottlerGuard");

  constructor(
    options: ThrottlerModuleOptions,
    storageService: ThrottlerStorage,
    reflector: Reflector,
    private readonly config: ConfigService
  ) {
    super(options, storageService, reflector);
  }

  protected async getTracker(request: Request): Promise<string> {
    const authorizationHeader = request.get("Authorization")?.replace("Bearer ", "");

    if (authorizationHeader) {
      return isApiKey(authorizationHeader, this.config.get<string>("api.apiKeyPrefix") ?? "cal_")
        ? `api_key_${authorizationHeader}`
        : `access_token_${authorizationHeader}`;
    }

    const oauthClientId = request.get(X_CAL_CLIENT_ID);

    if (oauthClientId) {
      return oauthClientId;
    }

    if (request.ip) {
      return request.ip;
    }

    this.logger.log(`no tracker found: ${request.url}`);
    return "unknown";
  }
}
