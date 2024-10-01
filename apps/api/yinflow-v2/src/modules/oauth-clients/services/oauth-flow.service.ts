import { BadRequestException, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { DateTime } from "luxon";

import { INVALID_ACCESS_TOKEN } from "@calcom/platform-constants";

import { TokenExpiredException } from "../../auth/guards/api-auth/token-expired.exception";
import { OAuthClientRepository } from "../../oauth-clients/oauth-client.repository";
import { TokensRepository } from "../../tokens/tokens.repository";

@Injectable()
export class OAuthFlowService {
  private logger = new Logger("OAuthFlowService");

  constructor(
    private readonly tokensRepository: TokensRepository,
    private readonly oAuthClientRepository: OAuthClientRepository
  ) {}

  async propagateAccessToken(accessToken: string) {
    try {
      const ownerId = await this.tokensRepository.getAccessTokenOwnerId(accessToken);
      let expiry = await this.tokensRepository.getAccessTokenExpiryDate(accessToken);

      if (!expiry) {
        this.logger.warn(`Token for ${ownerId} had no expiry time, assuming it's new.`);
        expiry = DateTime.now().plus({ minute: 60 }).startOf("minute").toJSDate();
      }
    } catch (err) {
      this.logger.error("Access Token Propagation Failed, falling back to DB...", err);
    }
  }

  async getOwnerId(accessToken: string) {
    const ownerIdFromDb = await this.tokensRepository.getAccessTokenOwnerId(accessToken);

    if (!ownerIdFromDb) throw new Error("Invalid Access Token, not present in Redis or DB");

    return ownerIdFromDb;
  }

  async validateAccessToken(secret: string) {
    // status can be "CACHE_HIT" or "CACHE_MISS", MISS will most likely mean the token has expired
    // but we need to check the SQL db for it anyways.
    const { status, cacheKey } = await this.readFromCache(secret);

    if (status === "CACHE_HIT") {
      return true;
    }

    const tokenExpiresAt = await this.tokensRepository.getAccessTokenExpiryDate(secret);

    if (!tokenExpiresAt) {
      throw new UnauthorizedException(INVALID_ACCESS_TOKEN);
    }

    if (new Date() > tokenExpiresAt) {
      throw new TokenExpiredException();
    }

    // we can't use a Promise#all or similar here because we care about execution order
    // however we can't allow caches to fail a validation hence the results are voided.

    return true;
  }

  private async readFromCache(secret: string) {
    const cacheKey = this._generateActKey(secret);

    return { status: "CACHE_MISS", cacheKey };
  }

  async exchangeAuthorizationToken(
    tokenId: string,
    clientId: string,
    clientSecret: string
  ): Promise<{ accessToken: string; refreshToken: string; accessTokenExpiresAt: Date }> {
    const oauthClient = await this.oAuthClientRepository.getOAuthClientWithAuthTokens(
      tokenId,
      clientId,
      clientSecret
    );

    if (!oauthClient) {
      throw new BadRequestException("Invalid OAuth Client.");
    }

    const authorizationToken = oauthClient.authorizationTokens[0];

    if (!authorizationToken || !authorizationToken.owner.id) {
      throw new BadRequestException("Invalid Authorization Token.");
    }

    const { accessToken, refreshToken, accessTokenExpiresAt } = await this.tokensRepository.createOAuthTokens(
      clientId,
      authorizationToken.owner.id
    );
    await this.tokensRepository.invalidateAuthorizationToken(authorizationToken.id);
    void this.propagateAccessToken(accessToken); // void result, ignored.

    return {
      accessToken,
      accessTokenExpiresAt,
      refreshToken,
    };
  }

  async refreshToken(clientId: string, clientSecret: string, tokenSecret: string) {
    const oauthClient = await this.oAuthClientRepository.getOAuthClientWithRefreshSecret(
      clientId,
      clientSecret,
      tokenSecret
    );

    if (!oauthClient) {
      throw new BadRequestException("Invalid OAuthClient credentials.");
    }

    const currentRefreshToken = oauthClient.refreshToken[0];

    if (!currentRefreshToken) {
      throw new BadRequestException("Invalid refresh token");
    }

    const { accessToken, refreshToken } = await this.tokensRepository.refreshOAuthTokens(
      clientId,
      currentRefreshToken.secret,
      currentRefreshToken.userId
    );

    return {
      accessToken: accessToken.secret,
      accessTokenExpiresAt: accessToken.expiresAt,
      refreshToken: refreshToken.secret,
    };
  }

  private _generateActKey(accessToken: string) {
    return `act_${accessToken}`;
  }

  private _generateOwnerIdKey(accessToken: string) {
    return `owner_${accessToken}`;
  }
}
