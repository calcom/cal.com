import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { ApiAuthGuardOnlyAllow } from "@/modules/auth/decorators/api-auth-guard-only-allow.decorator";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { OAuth2AuthorizeInput } from "@/modules/auth/oauth2/inputs/authorize.input";
import { OAuth2ExchangeInput } from "@/modules/auth/oauth2/inputs/exchange.input";
import { OAuth2RefreshInput } from "@/modules/auth/oauth2/inputs/refresh.input";
import { OAuth2ClientResponseDto } from "@/modules/auth/oauth2/outputs/oauth2-client.output";
import { OAuth2TokensResponseDto } from "@/modules/auth/oauth2/outputs/oauth2-tokens.output";
import { OAuth2Service } from "@/modules/auth/oauth2/services/oauth2.service";
import { Body, Controller, Get, HttpCode, HttpStatus, NotFoundException, Param, Post, Res, UseGuards } from "@nestjs/common";
import { ApiExcludeController, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";

import { SUCCESS_STATUS } from "@calcom/platform-constants";

@Controller({
  path: "/v2/auth/oauth2/clients/:clientId",
  version: API_VERSIONS_VALUES,
})
@ApiExcludeController(true)
@ApiTags("Auth / OAuth2")
export class OAuth2Controller {
  constructor(private readonly oauth2Service: OAuth2Service) {}

  @Get("/")
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiAuthGuard)
  @ApiOperation({
    summary: "Get OAuth2 client",
    description: "Returns the OAuth2 client information for the given client ID",
  })
  async getClient(@Param("clientId") clientId: string): Promise<OAuth2ClientResponseDto> {
    const client = await this.oauth2Service.getClient(clientId);

    if (!client) {
      throw new NotFoundException(`OAuth client with ID '${clientId}' not found`);
    }

    return {
      status: SUCCESS_STATUS,
      data: client,
    };
  }

  @Post("/authorize")
  @UseGuards(ApiAuthGuard)
  @ApiAuthGuardOnlyAllow(["NEXT_AUTH"])
  @ApiOperation({
    summary: "Generate authorization code",
    description:
      "Generates an authorization code for the OAuth2 flow and redirects to the redirect URI with the code. Requires user authentication.",
  })
  async authorize(
    @Param("clientId") clientId: string,
    @Body() body: OAuth2AuthorizeInput,
    @GetUser("id") userId: number,
    @Res() res: Response
  ): Promise<void> {
    const client = await this.oauth2Service.getClient(clientId);

    if (!client) {
      throw new NotFoundException(`OAuth client with ID '${clientId}' not found`);
    }

    try {
      const result = await this.oauth2Service.generateAuthorizationCode(
        clientId,
        userId,
        body.redirectUri,
        body.scopes,
        body.state,
        body.teamSlug,
        body.codeChallenge,
        body.codeChallengeMethod
      );

      return res.redirect(303, result.redirectUrl);
    } catch (error) {
      const errorRedirectUrl = this.oauth2Service.buildErrorRedirectUrl(body.redirectUri, error, body.state);

      return res.redirect(303, errorRedirectUrl);
    }
  }

  @Post("/exchange")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Exchange authorization code for tokens",
    description: "Exchanges an authorization code for access and refresh tokens",
  })
  async exchange(
    @Param("clientId") clientId: string,
    @Body() body: OAuth2ExchangeInput
  ): Promise<OAuth2TokensResponseDto> {
    const tokens = await this.oauth2Service.exchangeCodeForTokens(
      clientId,
      body.code,
      body.clientSecret,
      body.redirectUri,
      body.codeVerifier
    );

    return {
      status: SUCCESS_STATUS,
      data: tokens,
    };
  }

  @Post("/refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Refresh access token",
    description: "Refreshes an access token using a refresh token",
  })
  async refresh(
    @Param("clientId") clientId: string,
    @Body() body: OAuth2RefreshInput
  ): Promise<OAuth2TokensResponseDto> {
    const tokens = await this.oauth2Service.refreshAccessToken(
      clientId,
      body.refreshToken,
      body.clientSecret,
      body.codeVerifier
    );

    return {
      status: SUCCESS_STATUS,
      data: tokens,
    };
  }
}
