import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { isOriginAllowed } from "@/lib/is-origin-allowed/is-origin-allowed";
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
  ApiExcludeEndpoint as DocsExcludeEndpoint,
  ApiHeader as DocsHeader,
  ApiOperation,
} from "@nestjs/swagger";
import { Response as ExpressResponse } from "express";

import { SUCCESS_STATUS, X_CAL_SECRET_KEY } from "@calcom/platform-constants";

export const TOKENS_DOCS = `Access token is valid for 60 minutes and refresh token for 1 year. Make sure to store them in your database, for example, in your User database model \`calAccessToken\` and \`calRefreshToken\` fields.
Response also contains \`accessTokenExpiresAt\` and \`refreshTokenExpiresAt\` fields, but if you decode the jwt token the payload will contain \`clientId\` (OAuth client ID), \`ownerId\` (user to whom token belongs ID), \`iat\` (issued at time) and \`expiresAt\` (when does the token expire) fields.`;

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

    if (!isOriginAllowed(body.redirectUri, oauthClient.redirectUris)) {
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

    const tokens = await this.oAuthFlowService.exchangeAuthorizationToken(
      authorizeEndpointCode,
      clientId,
      body.clientSecret
    );

    return {
      status: SUCCESS_STATUS,
      data: tokens,
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
    description: `If managed user access token is expired then get a new one using this endpoint - it will also refresh the refresh token, because we use
    "refresh token rotation" mechanism. ${TOKENS_DOCS}`,
  })
  async refreshTokens(
    @Param("clientId") clientId: string,
    @Headers(X_CAL_SECRET_KEY) secretKey: string,
    @Body() body: RefreshTokenInput
  ): Promise<KeysResponseDto> {
    const tokens = await this.oAuthFlowService.refreshToken(clientId, secretKey, body.refreshToken);

    return {
      status: SUCCESS_STATUS,
      data: tokens,
    };
  }
}
