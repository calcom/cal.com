import { GetUser } from "@/modules/auth/decorator";
import { NextAuthGuard } from "@/modules/auth/guard";
import { OAuthAuthorizeInput } from "@/modules/oauth/flow/input/authorize.input";
import { ExchangeAuthorizationCodeInput } from "@/modules/oauth/flow/input/exchange-code.input";
import { OAuthClientGuard } from "@/modules/oauth/guard/oauth-client/oauth-client.guard";
import { OAuthClientRepository } from "@/modules/oauth/oauth-client.repository";
import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UseGuards,
} from "@nestjs/common";

import { SUCCESS_STATUS, X_CAL_CLIENT_ID } from "@calcom/platform-constants";
import { ApiResponse } from "@calcom/platform-types";

@Controller({
  path: "oauth",
  version: "2",
})
export class OAuthFlowController {
  private logger = new Logger("OauthFlowController");

  constructor(private readonly oauthClientRepository: OAuthClientRepository) {}

  @Post("/authorize")
  @HttpCode(HttpStatus.OK)
  @UseGuards(OAuthClientGuard, NextAuthGuard)
  async authorize(
    @Headers(X_CAL_CLIENT_ID) clientId: string,
    @Body() body: OAuthAuthorizeInput,
    @GetUser("id") userId: number
  ): Promise<ApiResponse<{ code: string }>> {
    const oauthClient = await this.oauthClientRepository.getOAuthClient(clientId);
    if (!oauthClient) {
      throw new BadRequestException();
    }

    if (!oauthClient?.redirect_uris.includes(body.redirect_uri)) {
      throw new BadRequestException("Invalid 'redirect_uri' value.");
    }

    const { id } = await this.oauthClientRepository.createAuthorizationToken(clientId, userId);

    // ! Redirecting should be taken care of by the client?

    return {
      status: SUCCESS_STATUS,
      data: {
        code: id,
      },
    };
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
}
