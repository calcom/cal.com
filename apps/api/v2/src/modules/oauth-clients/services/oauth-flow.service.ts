import { TokenExpiredException } from "@/modules/auth/guards/access-token/token-expired.exception";
import { OAuthClientRepository } from "@/modules/oauth-clients/oauth-client.repository";
import { RedisService } from "@/modules/redis/redis.service";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
import { BadRequestException, Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { DateTime } from "luxon";

import { INVALID_ACCESS_TOKEN } from "@calcom/platform-constants";

@Injectable()
export class OAuthFlowService {
  private logger = new Logger("OAuthFlowService");

  constructor(
    private readonly tokensRepository: TokensRepository,
    private readonly oAuthClientRepository: OAuthClientRepository,
    private readonly redisService: RedisService
  ) {}

  async propagateAccessToken(accessToken: string) {
    try {
      const ownerId = await this.tokensRepository.getAccessTokenOwnerId(accessToken);
      let expiry = await this.tokensRepository.getAccessTokenExpiryDate(accessToken);

      if (!expiry) {
        this.logger.warn(`Token for ${ownerId} had no expiry time, assuming it's new.`);
        expiry = DateTime.now().plus({ minute: 60 }).startOf("minute").toJSDate();
      }

      const cacheKey = this._generateActKey(accessToken);
      await this.redisService.redis.hmset(cacheKey, {
        ownerId: ownerId,
        expiresAt: expiry?.toJSON(),
      });

      await this.redisService.redis.expireat(cacheKey, Math.floor(expiry.getTime() / 1000));
    } catch (err) {
      this.logger.error("Access Token Propagation Failed, falling back to DB...", err);
    }
  }

  async getOwnerId(accessToken: string) {
    const cacheKey = this._generateOwnerIdKey(accessToken);

    try {
      const ownerId = await this.redisService.redis.get(cacheKey);
      if (ownerId) {
        return Number.parseInt(ownerId);
      }
    } catch (err) {
      this.logger.warn("Cache#getOwnerId fetch failed, falling back to DB...");
    }

    const ownerIdFromDb = await this.tokensRepository.getAccessTokenOwnerId(accessToken);

    if (!ownerIdFromDb) throw new Error("Invalid Access Token, not present in Redis or DB");

    // await in case of race conditions, but void it's return since cache writes shouldn't halt execution.
    void (await this.redisService.redis.setex(cacheKey, 3600, ownerIdFromDb)); // expires in 1 hour

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
    void (await this.redisService.redis.hmset(cacheKey, { expiresAt: tokenExpiresAt.toJSON() }));
    void (await this.redisService.redis.expireat(cacheKey, Math.floor(tokenExpiresAt.getTime() / 1000)));

    return true;
  }

  private async readFromCache(secret: string) {
    const cacheKey = this._generateActKey(secret);
    const tokenData = await this.redisService.redis.hgetall(cacheKey);

    if (tokenData && new Date() < new Date(tokenData.expiresAt)) {
      return { status: "CACHE_HIT", cacheKey };
    }

    return { status: "CACHE_MISS", cacheKey };
  }

  async exchangeAuthorizationToken(
    tokenId: string,
    clientId: string,
    clientSecret: string
  ): Promise<{ accessToken: string; refreshToken: string }> {
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

    const { accessToken, refreshToken } = await this.tokensRepository.createOAuthTokens(
      clientId,
      authorizationToken.owner.id
    );
    await this.tokensRepository.invalidateAuthorizationToken(authorizationToken.id);
    void this.propagateAccessToken(accessToken); // void result, ignored.

    return {
      accessToken,
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
