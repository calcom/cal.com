import { GetUser } from "@/modules/auth/decorator";
import { NextAuthGuard } from "@/modules/auth/guard";
import { OAuthAuthorizeInput } from "@/modules/oauth/flow/input/authorize.input";
import { ExchangeAuthorizationCodeInput } from "@/modules/oauth/flow/input/exchange-code.input";
import { RefreshTokenInput } from "@/modules/oauth/flow/input/refresh-token.input";
import { OAuthClientGuard } from "@/modules/oauth/guard/oauth-client/oauth-client.guard";
import { OAuthClientRepository } from "@/modules/oauth/oauth-client.repository";
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
  constructor(private readonly oauthClientRepository: OAuthClientRepository) {}

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

    const { id } = await this.oauthClientRepository.createAuthorizationToken(body.client_id, userId);

    return res.redirect(`${body.redirect_uri}?code=${id}`);
  }

  @Post("/exchange")
  @HttpCode(HttpStatus.OK)
  async exchange(
    @Headers("Authorization") authorization: string,
    @Body() body: ExchangeAuthorizationCodeInput
  ): Promise<ApiResponse<{ access_token: string; refresh_token: string }>> {
    const bearerToken = authorization.replace("Bearer ", "").trim();
    if (!bearerToken) {
      throw new BadRequestException("Missing 'Bearer' Authorization header.");
    }

    const { access_token, refresh_token } = await this.oauthClientRepository.exchangeAuthorizationToken(
      bearerToken,
      body
    );

    return {
      status: SUCCESS_STATUS,
      data: {
        access_token,
        refresh_token,
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
  ): Promise<ApiResponse<{ access_token: string; refresh_token: string }>> {
    const { access_token, refresh_token } = await this.oauthClientRepository.refreshToken(
      clientId,
      secretKey,
      body.refresh_token
    );

    return {
      status: SUCCESS_STATUS,
      data: {
        access_token,
        refresh_token,
      },
    };
  }
}
