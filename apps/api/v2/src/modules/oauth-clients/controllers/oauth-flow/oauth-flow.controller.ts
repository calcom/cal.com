import { GetUser } from "@/modules/auth/decorator";
import { NextAuthGuard } from "@/modules/auth/guard";
import { OAuthClientGuard } from "@/modules/oauth-clients/guards/oauth-client/oauth-client.guard";
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
  Post,
  Response,
  UseGuards,
} from "@nestjs/common";
import { Response as ExpressResponse } from "express";

import { SUCCESS_STATUS, X_CAL_CLIENT_ID, X_CAL_SECRET_KEY } from "@calcom/platform-constants";
import { ApiResponse } from "@calcom/platform-types";

@Controller({
  path: "oauth",
  version: "2",
})
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
    @Body() body: OAuthAuthorizeInput,
    @GetUser("id") userId: number,
    @Response() res: ExpressResponse
  ): Promise<void> {
    const oauthClient = await this.oauthClientRepository.getOAuthClient(body.client_id);
    if (!oauthClient) {
      throw new BadRequestException();
    }

    if (!oauthClient?.redirect_uris.includes(body.redirect_uri)) {
      throw new BadRequestException("Invalid 'redirect_uri' value.");
    }

    const { id } = await this.tokensRepository.createAuthorizationToken(body.client_id, userId);

    return res.redirect(`${body.redirect_uri}?code=${id}`);
  }

  @Post("/exchange")
  @HttpCode(HttpStatus.OK)
  async exchange(
    @Headers("Authorization") authorization: string,
    @Body() body: ExchangeAuthorizationCodeInput
  ): Promise<ApiResponse<{ accessToken: string; refreshToken: string }>> {
    const bearerToken = authorization.replace("Bearer ", "").trim();
    if (!bearerToken) {
      throw new BadRequestException("Missing 'Bearer' Authorization header.");
    }

    const { accessToken: accessToken, refreshToken: refreshToken } =
      await this.oAuthFlowService.exchangeAuthorizationToken(bearerToken, body);

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
  @UseGuards(OAuthClientGuard)
  async refreshAccessToken(
    @Headers(X_CAL_CLIENT_ID) clientId: string,
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
