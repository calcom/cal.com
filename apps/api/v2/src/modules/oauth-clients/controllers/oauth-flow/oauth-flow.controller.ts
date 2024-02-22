import { getEnv } from "@/env";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { NextAuthGuard } from "@/modules/auth/guards/next-auth/next-auth.guard";
import { OAuthClientCredentialsGuard } from "@/modules/oauth-clients/guards/oauth-client-credentials/oauth-client-credentials.guard";
import { OAuthAuthorizeInput } from "@/modules/oauth-clients/inputs/authorize.input";
import { ExchangeAuthorizationCodeInput } from "@/modules/oauth-clients/inputs/exchange-code.input";
import { RefreshTokenInput } from "@/modules/oauth-clients/inputs/refresh-token.input";
import { OAuthClientRepository } from "@/modules/oauth-clients/oauth-client.repository";
import { OAuthFlowService } from "@/modules/oauth-clients/services/oauth-flow.service";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Response,
  UseGuards,
} from "@nestjs/common";
import { ApiTags as DocsTags, ApiExcludeController as DocsExcludeController } from "@nestjs/swagger";
import { Response as ExpressResponse } from "express";

import { SUCCESS_STATUS, X_CAL_SECRET_KEY } from "@calcom/platform-constants";
import { ApiResponse } from "@calcom/platform-types";

@Controller({
  path: "oauth/:clientId",
  version: "2",
})
@DocsExcludeController(getEnv("NODE_ENV") === "production")
@DocsTags("Development only")
export class OAuthFlowController {
  constructor(
    private readonly oauthClientRepository: OAuthClientRepository,
    private readonly tokensRepository: TokensRepository,
    private readonly oAuthFlowService: OAuthFlowService
  ) {}

  @Post("/authorize")
  @HttpCode(HttpStatus.OK)
  @UseGuards(NextAuthGuard)
  async authorize(
    @Param("clientId") clientId: string,
    @Body() body: OAuthAuthorizeInput,
    @GetUser("id") userId: number,
    @Response() res: ExpressResponse
  ): Promise<void> {
    const oauthClient = await this.oauthClientRepository.getOAuthClient(clientId);
    if (!oauthClient) {
      throw new BadRequestException(`OAuth client with ID '${clientId}' not found`);
    }

    if (!oauthClient?.redirectUris.includes(body.redirectUri)) {
      throw new BadRequestException("Invalid 'redirect_uri' value.");
    }

    const alreadyAuthorized = await this.tokensRepository.getAuthorizationTokenByClientUserIds(
      clientId,
      userId
    );

    if (alreadyAuthorized) {
      throw new BadRequestException(
        `User with id=${userId} has already authorized client with id=${clientId}.`
      );
    }

    const { id } = await this.tokensRepository.createAuthorizationToken(clientId, userId);

    return res.redirect(`${body.redirectUri}?code=${id}`);
  }

  @Post("/exchange")
  @HttpCode(HttpStatus.OK)
  async exchange(
    @Headers("Authorization") authorization: string,
    @Param("clientId") clientId: string,
    @Body() body: ExchangeAuthorizationCodeInput
  ): Promise<ApiResponse<{ accessToken: string; refreshToken: string }>> {
    const authorizeEndpointCode = authorization.replace("Bearer ", "").trim();
    if (!authorizeEndpointCode) {
      throw new BadRequestException("Missing 'Bearer' Authorization header.");
    }

    const { accessToken, refreshToken } = await this.oAuthFlowService.exchangeAuthorizationToken(
      authorizeEndpointCode,
      clientId,
      body.clientSecret
    );

    return {
      status: SUCCESS_STATUS,
      data: {
        accessToken,
        refreshToken,
      },
    };
  }

  @Post("/refresh")
  @HttpCode(HttpStatus.OK)
  @UseGuards(OAuthClientCredentialsGuard)
  async refreshAccessToken(
    @Param("clientId") clientId: string,
    @Headers(X_CAL_SECRET_KEY) secretKey: string,
    @Body() body: RefreshTokenInput
  ): Promise<ApiResponse<{ accessToken: string; refreshToken: string }>> {
    const { accessToken, refreshToken } = await this.oAuthFlowService.refreshToken(
      clientId,
      secretKey,
      body.refreshToken
    );

    return {
      status: SUCCESS_STATUS,
      data: {
        accessToken: accessToken,
        refreshToken: refreshToken,
      },
    };
  }
}
