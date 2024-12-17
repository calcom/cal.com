import { getEnv } from "@/env";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { NextAuthGuard } from "@/modules/auth/guards/next-auth/next-auth.guard";
import { KeysResponseDto } from "@/modules/oauth-clients/controllers/oauth-flow/responses/KeysResponse.dto";
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
import {
  ApiTags as DocsTags,
  ApiExcludeController as DocsExcludeController,
  ApiOperation as DocsOperation,
  ApiOkResponse as DocsOkResponse,
  ApiExcludeEndpoint as DocsExcludeEndpoint,
  ApiBadRequestResponse as DocsBadRequestResponse,
  ApiHeader as DocsHeader,
  ApiOperation,
} from "@nestjs/swagger";
import { Response as ExpressResponse } from "express";

import { SUCCESS_STATUS, X_CAL_SECRET_KEY } from "@calcom/platform-constants";

@Controller({
  path: "/v2/oauth/:clientId",
  version: API_VERSIONS_VALUES,
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
  @DocsExcludeEndpoint()
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
  @DocsExcludeEndpoint()
  async exchange(
    @Headers("Authorization") authorization: string,
    @Param("clientId") clientId: string,
    @Body() body: ExchangeAuthorizationCodeInput
  ): Promise<KeysResponseDto> {
    const authorizeEndpointCode = authorization.replace("Bearer ", "").trim();
    if (!authorizeEndpointCode) {
      throw new BadRequestException("Missing 'Bearer' Authorization header.");
    }

    const { accessToken, refreshToken, accessTokenExpiresAt } =
      await this.oAuthFlowService.exchangeAuthorizationToken(
        authorizeEndpointCode,
        clientId,
        body.clientSecret
      );

    return {
      status: SUCCESS_STATUS,
      data: {
        accessToken,
        accessTokenExpiresAt: accessTokenExpiresAt.valueOf(),
        refreshToken,
      },
    };
  }

  @Post("/refresh")
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiAuthGuard)
  @DocsTags("Platform / Managed Users")
  @DocsHeader({
    name: X_CAL_SECRET_KEY,
    description: "OAuth client secret key.",
    required: true,
  })
  @ApiOperation({
    summary: "Refresh managed user tokens",
    description: `If managed user access token is expired then get a new one using this endpoint. Each access token is valid for 60 minutes and 
    each refresh token for 1 year. Make sure to store them later in your database, for example, by updating the User model to have \`calAccessToken\` and \`calRefreshToken\` columns.`,
  })
  async refreshTokens(
    @Param("clientId") clientId: string,
    @Headers(X_CAL_SECRET_KEY) secretKey: string,
    @Body() body: RefreshTokenInput
  ): Promise<KeysResponseDto> {
    const { accessToken, refreshToken, accessTokenExpiresAt } = await this.oAuthFlowService.refreshToken(
      clientId,
      secretKey,
      body.refreshToken
    );

    return {
      status: SUCCESS_STATUS,
      data: {
        accessToken: accessToken,
        accessTokenExpiresAt: accessTokenExpiresAt.valueOf(),
        refreshToken: refreshToken,
      },
    };
  }
}
