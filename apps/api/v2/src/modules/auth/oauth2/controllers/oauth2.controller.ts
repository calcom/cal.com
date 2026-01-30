import { SUCCESS_STATUS } from "@calcom/platform-constants";
import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
  UseFilters,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBody,
  ApiExcludeController,
  ApiExtraModels,
  ApiOperation,
  ApiTags,
  getSchemaPath,
} from "@nestjs/swagger";
import { plainToInstance } from "class-transformer";
import type { Response } from "express";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { OAuthService } from "@/lib/services/oauth.service";
import { ApiAuthGuardOnlyAllow } from "@/modules/auth/decorators/api-auth-guard-only-allow.decorator";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { OAuth2RedirectExceptionFilter } from "@/modules/auth/oauth2/filters/oauth2-redirect-exception.filter";
import { OAuth2AuthorizeInput } from "@/modules/auth/oauth2/inputs/authorize.input";
import {
  OAuth2ExchangeConfidentialInput,
  OAuth2ExchangePublicInput,
  OAuth2LegacyExchangeInput,
} from "@/modules/auth/oauth2/inputs/exchange.input";
import {
  OAuth2LegacyRefreshInput,
  OAuth2RefreshConfidentialInput,
  OAuth2RefreshPublicInput,
} from "@/modules/auth/oauth2/inputs/refresh.input";
import type { OAuth2TokenInput } from "@/modules/auth/oauth2/inputs/token.input.pipe";
import { OAuth2TokenInputPipe } from "@/modules/auth/oauth2/inputs/token.input.pipe";
import { OAuth2ClientDto, OAuth2ClientResponseDto } from "@/modules/auth/oauth2/outputs/oauth2-client.output";
import { OAuth2TokensDto, OAuth2TokensResponseDto } from "@/modules/auth/oauth2/outputs/oauth2-tokens.output";
import { OAuth2ErrorHandler } from "@/modules/auth/oauth2/services/oauth2-error.handler";

@Controller({
  path: "/v2/auth/oauth2",
  version: API_VERSIONS_VALUES,
})
@ApiExcludeController(true)
@ApiTags("OAuth2")
export class OAuth2Controller {
  constructor(
    private readonly oAuthService: OAuthService,
    private readonly errorHandler: OAuth2ErrorHandler
  ) {}

  @Get("/clients/:clientId")
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiAuthGuard)
  @ApiOperation({
    summary: "Get OAuth2 client",
    description: "Returns the OAuth2 client information for the given client ID",
  })
  async getClient(@Param("clientId") clientId: string): Promise<OAuth2ClientResponseDto> {
    try {
      const client = await this.oAuthService.getClient(clientId);

      return {
        status: SUCCESS_STATUS,
        data: plainToInstance(OAuth2ClientDto, client, { strategy: "excludeAll" }),
      };
    } catch (err) {
      this.errorHandler.handleClientError(err, "Could not get oAuthClient");
    }
  }

  @Post("/clients/:clientId/authorize")
  @UseGuards(ApiAuthGuard)
  @ApiAuthGuardOnlyAllow(["NEXT_AUTH"])
  @UseFilters(OAuth2RedirectExceptionFilter)
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
    try {
      const client = await this.oAuthService.getClient(clientId);
      const result = await this.oAuthService.generateAuthorizationCode(
        client.clientId,
        userId,
        body.redirect_uri,
        body.scopes,
        body.state,
        body.team_slug,
        body.code_challenge,
        body.code_challenge_method
      );
      return res.redirect(303, result.redirectUrl);
    } catch (err) {
      this.errorHandler.handleAuthorizeError(err, body.redirect_uri, body.state);
    }
  }

  @Post("/clients/:clientId/exchange")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Exchange authorization code for tokens (legacy)",
    description:
      "Exchanges an authorization code for access and refresh tokens. Use POST /token for RFC 6749 compliance.",
  })
  async exchange(
    @Param("clientId") clientId: string,
    @Body() body: OAuth2LegacyExchangeInput
  ): Promise<OAuth2TokensResponseDto> {
    try {
      const tokens = await this.oAuthService.exchangeCodeForTokens(
        clientId,
        body.code,
        body.clientSecret,
        body.redirectUri,
        body.codeVerifier
      );
      return {
        status: SUCCESS_STATUS,
        data: plainToInstance(OAuth2TokensDto, tokens, { strategy: "excludeAll" }),
      };
    } catch (err) {
      this.errorHandler.handleClientError(err, "Could not exchange code for tokens");
    }
  }

  @Post("/clients/:clientId/refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Refresh access token (legacy)",
    description: "Refreshes an access token using a refresh token. Use POST /token for RFC 6749 compliance.",
  })
  async refresh(
    @Param("clientId") clientId: string,
    @Body() body: OAuth2LegacyRefreshInput
  ): Promise<OAuth2TokensResponseDto> {
    try {
      const tokens = await this.oAuthService.refreshAccessToken(
        clientId,
        body.refreshToken,
        body.clientSecret
      );
      return {
        status: SUCCESS_STATUS,
        data: plainToInstance(OAuth2TokensDto, tokens, { strategy: "excludeAll" }),
      };
    } catch (err) {
      this.errorHandler.handleClientError(err, "Could not refresh tokens");
    }
  }

  @Post("/token")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Exchange authorization code or refresh token for tokens",
    description:
      "RFC 6749-compliant token endpoint. Pass client_id in the request body (Section 2.3.1). " +
      "Use grant_type 'authorization_code' to exchange an auth code for tokens, or 'refresh_token' to refresh an access token. " +
      "Accepts both application/x-www-form-urlencoded (standard per RFC 6749 Section 4.1.3) and application/json content types.",
  })
  @ApiBody({
    schema: {
      oneOf: [
        { $ref: getSchemaPath(OAuth2ExchangeConfidentialInput) },
        { $ref: getSchemaPath(OAuth2ExchangePublicInput) },
        { $ref: getSchemaPath(OAuth2RefreshConfidentialInput) },
        { $ref: getSchemaPath(OAuth2RefreshPublicInput) },
      ],
    },
    description:
      "Token request body. client_id is required. " +
      "Accepts application/x-www-form-urlencoded (RFC 6749 standard) or application/json. " +
      "Use grant_type 'authorization_code' with client_secret (confidential) or code_verifier (public/PKCE), or grant_type 'refresh_token' with client_secret (confidential) or just the refresh_token (public).",
  })
  @ApiExtraModels(
    OAuth2ExchangeConfidentialInput,
    OAuth2ExchangePublicInput,
    OAuth2RefreshConfidentialInput,
    OAuth2RefreshPublicInput
  )
  @Header("Cache-Control", "no-store")
  @Header("Pragma", "no-cache")
  async token(@Body(new OAuth2TokenInputPipe()) body: OAuth2TokenInput): Promise<OAuth2TokensDto> {
    try {
      const tokens = await this.oAuthService.handleTokenRequest(body.client_id, body);

      return plainToInstance(OAuth2TokensDto, tokens, { strategy: "excludeAll" });
    } catch (err) {
      this.errorHandler.handleTokenError(err);
    }
  }
}
