import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { ErrorWithCode, getHttpStatusCode } from "@calcom/platform-libraries/errors";
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  Param,
  Post,
  Res,
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
import { OAuth2AuthorizeInput } from "@/modules/auth/oauth2/inputs/authorize.input";
import {
  OAuth2ExchangeConfidentialInput,
  OAuth2ExchangePublicInput,
} from "@/modules/auth/oauth2/inputs/exchange.input";
import {
  OAuth2RefreshConfidentialInput,
  OAuth2RefreshPublicInput,
} from "@/modules/auth/oauth2/inputs/refresh.input";
import type { OAuth2TokenInput } from "@/modules/auth/oauth2/inputs/token.input.pipe";
import { OAuth2TokenInputPipe } from "@/modules/auth/oauth2/inputs/token.input.pipe";
import { OAuth2ClientDto, OAuth2ClientResponseDto } from "@/modules/auth/oauth2/outputs/oauth2-client.output";
import { OAuth2TokensDto, OAuth2TokensResponseDto } from "@/modules/auth/oauth2/outputs/oauth2-tokens.output";

@Controller({
  path: "/v2/auth/oauth2/clients/:clientId",
  version: API_VERSIONS_VALUES,
})
@ApiExcludeController(true)
@ApiTags("OAuth2")
export class OAuth2Controller {
  private readonly logger = new Logger("OAuth2Controller");

  constructor(private readonly oAuthService: OAuthService) {}

  @Get("/")
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
    } catch (err: unknown) {
      if (err instanceof ErrorWithCode) {
        const statusCode = getHttpStatusCode(err);
        throw new HttpException(err.message, statusCode);
      }
      this.logger.error(err);
      throw new InternalServerErrorException("Could not get oAuthClient");
    }
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
    try {
      const client = await this.oAuthService.getClient(clientId);
      const result = await this.oAuthService.generateAuthorizationCode(
        client.clientId,
        userId,
        body.redirectUri,
        body.scopes,
        body.state,
        body.teamSlug,
        body.codeChallenge,
        body.codeChallengeMethod
      );
      return res.redirect(303, result.redirectUrl);
    } catch (err: unknown) {
      if (err instanceof ErrorWithCode) {
        if (err.message === "unauthorized_client" || err?.data?.["reason"] === "redirect_uri_mismatch") {
          const statusCode = getHttpStatusCode(err);
          throw new HttpException(err.message, statusCode);
        }
      }
      const errorRedirectUrl = this.oAuthService.buildErrorRedirectUrl(body.redirectUri, err, body.state);
      return res.redirect(303, errorRedirectUrl);
    }
  }

  @Post("/token")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Exchange authorization code or refresh token for tokens",
    description:
      "OAuth2 token endpoint. Use grant_type 'authorization_code' to exchange an auth code for tokens, or 'refresh_token' to refresh an access token.",
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
      "Token request body. Use grantType 'authorization_code' with clientSecret (confidential) or codeVerifier (public/PKCE), or grantType 'refresh_token' with clientSecret (confidential) or just the refreshToken (public).",
  })
  @ApiExtraModels(
    OAuth2ExchangeConfidentialInput,
    OAuth2ExchangePublicInput,
    OAuth2RefreshConfidentialInput,
    OAuth2RefreshPublicInput
  )
  async token(
    @Param("clientId") clientId: string,
    @Body(new OAuth2TokenInputPipe()) body: OAuth2TokenInput
  ): Promise<OAuth2TokensResponseDto> {
    try {
      const tokens = await this.oAuthService.handleTokenRequest(clientId, body);

      return {
        status: SUCCESS_STATUS,
        data: plainToInstance(OAuth2TokensDto, tokens, { strategy: "excludeAll" }),
      };
    } catch (err: unknown) {
      if (err instanceof ErrorWithCode) {
        const statusCode = getHttpStatusCode(err);
        throw new HttpException(err.message, statusCode);
      }
      this.logger.error(err);
      throw new InternalServerErrorException("Could not process token request");
    }
  }
}
