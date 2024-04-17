import { BaseStrategy } from "@/lib/passport/strategies/types";
import { ApiKeyService } from "@/modules/api-key/api-key.service";
import { OAuthFlowService } from "@/modules/oauth-clients/services/oauth-flow.service";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
import { UserWithProfile, UsersRepository } from "@/modules/users/users.repository";
import { Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import type { Request } from "express";

import { INVALID_ACCESS_TOKEN } from "@calcom/platform-constants";

@Injectable()
export class BearerStrategy extends PassportStrategy(BaseStrategy, "bearer") {
  constructor(
    private readonly oauthFlowService: OAuthFlowService,
    private readonly tokensRepository: TokensRepository,
    private readonly userRepository: UsersRepository,
    private readonly apiKeyService: ApiKeyService
  ) {
    super();
  }

  async authenticate(request: Request) {
    try {
      const bearerToken = this.getBearerToken(request);
      let bearerTokenUser: UserWithProfile;

      if (!bearerToken) {
        throw new UnauthorizedException(INVALID_ACCESS_TOKEN);
      }

      if (isApiKey(bearerToken)) {
        bearerTokenUser = await this.getApiKeyUser(request);
      } else {
        bearerTokenUser = await this.getAccessTokenUser(request);
      }

      this.success(bearerTokenUser);
    } catch (error) {
      if (error instanceof Error) return this.error(error);
    }
  }

  getBearerToken(request: Request) {
    return request.get("Authorization")?.replace("Bearer ", "");
  }

  async getAccessTokenUser(request: Request) {
    const accessToken = request.get("Authorization")?.replace("Bearer ", "");
    const requestOrigin = request.get("Origin");

    if (!accessToken) {
      throw new UnauthorizedException(INVALID_ACCESS_TOKEN);
    }

    await this.oauthFlowService.validateAccessToken(accessToken);
    const client = await this.tokensRepository.getAccessTokenClient(accessToken);
    if (!client) {
      throw new UnauthorizedException("OAuth client not found given the access token");
    }

    if (requestOrigin && !client.redirectUris.some((uri) => uri.startsWith(requestOrigin))) {
      throw new UnauthorizedException("Invalid request origin");
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

  async getApiKeyUser(request: Request) {
    const apiKey = await this.apiKeyService.retrieveApiKey(request);
    if (!apiKey) {
      throw new UnauthorizedException("Authorization token is missing.");
    }

    if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
      throw new UnauthorizedException("The API key is expired.");
    }

    const user = await this.userRepository.findByIdWithProfile(apiKey.userId);
    if (!user) {
      throw new NotFoundException("User not found.");
    }

    return user;
  }
}

export function isApiKey(bearerToken: string) {
  return bearerToken.startsWith("cal_");
}
