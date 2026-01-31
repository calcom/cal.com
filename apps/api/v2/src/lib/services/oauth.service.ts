import type { OAuth2Tokens } from "@calcom/platform-libraries";
import { OAuthService as BaseOAuthService } from "@calcom/platform-libraries";
import { Injectable } from "@nestjs/common";
import { PrismaAccessCodeRepository } from "@/lib/repositories/prisma-access-code.repository";
import { PrismaOAuthClientRepository } from "@/lib/repositories/prisma-oauth-client.repository";
import { PrismaTeamRepository } from "@/lib/repositories/prisma-team.repository";
import type { OAuth2ExchangeInput } from "@/modules/auth/oauth2/inputs/exchange.input";
import { OAuth2ExchangeConfidentialInput } from "@/modules/auth/oauth2/inputs/exchange.input";
import type { OAuth2RefreshInput } from "@/modules/auth/oauth2/inputs/refresh.input";
import { OAuth2RefreshConfidentialInput } from "@/modules/auth/oauth2/inputs/refresh.input";
import type { OAuth2TokenInput } from "@/modules/auth/oauth2/inputs/token.input.pipe";

@Injectable()
export class OAuthService extends BaseOAuthService {
  constructor(
    accessCodeRepository: PrismaAccessCodeRepository,
    oAuthClientRepository: PrismaOAuthClientRepository,
    teamsRepository: PrismaTeamRepository
  ) {
    super({
      accessCodeRepository: accessCodeRepository,
      oAuthClientRepository: oAuthClientRepository,
      teamsRepository: teamsRepository,
    });
  }

  async handleTokenRequest(clientId: string, body: OAuth2TokenInput): Promise<OAuth2Tokens> {
    switch (body.grant_type) {
      case "authorization_code":
        return this.exchangeAuthorizationCode(clientId, body);
      case "refresh_token":
        return this.refreshToken(clientId, body);
    }
  }

  private async exchangeAuthorizationCode(
    clientId: string,
    body: OAuth2ExchangeInput
  ): Promise<OAuth2Tokens> {
    if (body instanceof OAuth2ExchangeConfidentialInput) {
      return this.exchangeCodeForTokens(clientId, body.code, body.client_secret, body.redirect_uri);
    }

    return this.exchangeCodeForTokens(clientId, body.code, undefined, body.redirect_uri, body.code_verifier);
  }

  private async refreshToken(clientId: string, body: OAuth2RefreshInput): Promise<OAuth2Tokens> {
    if (body instanceof OAuth2RefreshConfidentialInput) {
      return this.refreshAccessToken(clientId, body.refresh_token, body.client_secret);
    }

    return this.refreshAccessToken(clientId, body.refresh_token);
  }
}
