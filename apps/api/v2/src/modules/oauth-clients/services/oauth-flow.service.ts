import { TokenExpiredException } from "@/modules/auth/guards/access-token/token-expired.exception";
import { OAuthClientRepository } from "@/modules/oauth-clients/oauth-client.repository";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";

import { INVALID_ACCESS_TOKEN } from "@calcom/platform-constants";

@Injectable()
export class OAuthFlowService {
  constructor(
    private readonly tokensRepository: TokensRepository,
    private readonly oAuthClientRepository: OAuthClientRepository //private readonly redisService: RedisIOService
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async propagateAccessToken(accessToken: string) {
    // this.logger.log("Propagating access token to redis", accessToken);
    // TODO propagate
    //this.redisService.redis.hset("access_tokens", accessToken,)
    return void 0;
  }

  async getOwnerId(accessToken: string) {
    return this.tokensRepository.getAccessTokenOwnerId(accessToken);
  }

  async validateAccessToken(secret: string) {
    // status can be "CACHE_HIT" or "CACHE_MISS", MISS will most likely mean the token has expired
    // but we need to check the SQL db for it anyways.
    const { status } = await this.readFromCache(secret);

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

    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async readFromCache(secret: string) {
    return { status: "CACHE_MISS" };
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
    void this.propagateAccessToken(accessToken); // voided as we don't need to await

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
}
