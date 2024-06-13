import { BaseStrategy } from "@/lib/passport/strategies/types";
import { ApiKeyRepository } from "@/modules/api-key/api-key-repository";
import { DeploymentsService } from "@/modules/deployments/deployments.service";
import { OAuthFlowService } from "@/modules/oauth-clients/services/oauth-flow.service";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
import { UserWithProfile, UsersRepository } from "@/modules/users/users.repository";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { createHash } from "crypto";
import type { Request } from "express";

import { INVALID_ACCESS_TOKEN } from "@calcom/platform-constants";

@Injectable()
export class ApiAuthStrategy extends PassportStrategy(BaseStrategy, "api-auth") {
  constructor(
    private readonly deploymentsService: DeploymentsService,
    private readonly config: ConfigService,
    private readonly oauthFlowService: OAuthFlowService,
    private readonly tokensRepository: TokensRepository,
    private readonly userRepository: UsersRepository,
    private readonly apiKeyRepository: ApiKeyRepository
  ) {
    super();
  }

  async apiKeyStrategy(apiKey: string) {
    const isLicenseValid = await this.deploymentsService.checkLicense();
    if (!isLicenseValid && this.config.get("env") === "production") {
      throw new UnauthorizedException("Invalid or missing CALCOM_LICENSE_KEY environment variable");
    }
    const strippedApiKey = apiKey.replace(this.config.get<string>("api.keyPrefix") ?? "_cal", "");
    const apiKeyHash = createHash("sha256").update(strippedApiKey).digest("hex");
    const keyData = await this.apiKeyRepository.getApiKeyFromHash(apiKeyHash);
    if (!keyData) {
      throw new UnauthorizedException("Your apiKey is not valid");
    }
    const isKeyExpired =
      keyData.expiresAt && new Date().setHours(0, 0, 0, 0) > keyData.expiresAt.setHours(0, 0, 0, 0);
    if (isKeyExpired) {
      throw new UnauthorizedException("Your apiKey is expired");
    }
    const apiKeyOwnerId = keyData.userId;
    if (!apiKeyOwnerId) {
      throw new UnauthorizedException("No user found for this apiKey");
    }

    const user: UserWithProfile | null = await this.userRepository.findByIdWithProfile(apiKeyOwnerId);

    if (!user) {
      throw new UnauthorizedException("No user found for this apiKey");
    }
  }

  async accessTokenStrategy(accessToken: string, origin?: string) {
    const accessTokenValid = await this.oauthFlowService.validateAccessToken(accessToken);
    if (!accessTokenValid) {
      throw new UnauthorizedException(INVALID_ACCESS_TOKEN);
    }

    const client = await this.tokensRepository.getAccessTokenClient(accessToken);
    if (!client) {
      throw new UnauthorizedException("OAuth client not found given the access token");
    }

    if (origin && !client.redirectUris.some((uri) => uri.startsWith(origin))) {
      throw new UnauthorizedException(
        `Invalid request origin - please open https://app.cal.com/settings/platform and add the origin '${origin}' to the 'Redirect uris' of your OAuth client.`
      );
    }

    const ownerId = await this.tokensRepository.getAccessTokenOwnerId(accessToken);

    if (!ownerId) {
      throw new UnauthorizedException(INVALID_ACCESS_TOKEN);
    }

    const user: UserWithProfile | null = await this.userRepository.findByIdWithProfile(ownerId);

    if (!user) {
      throw new UnauthorizedException(INVALID_ACCESS_TOKEN);
    }

    return user;
  }

  async authenticate(request: Request) {
    const authSring = request.get("Authorization")?.replace("Bearer ", "");
    const isApiKey = authSring?.startsWith(this.config.get("api.apiKeyPrefix") ?? "_cal");
    const requestOrigin = request.get("Origin");

    if (!authSring) {
      throw new UnauthorizedException("No Authorization header provided");
    }

    if (isApiKey) {
      return this.apiKeyStrategy(authSring);
    }

    return this.accessTokenStrategy(authSring, requestOrigin);
  }
}
