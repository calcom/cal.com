import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { OAuthService } from "@/lib/services/oauth.service";
import { OAuth2TokenInput } from "@/modules/auth/oauth2/inputs/token.input";
import { OAuth2TokensDto, OAuth2TokensResponseDto } from "@/modules/auth/oauth2/outputs/oauth2-tokens.output";
import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  Post,
} from "@nestjs/common";
import { ApiConsumes, ApiExcludeController, ApiOperation, ApiTags } from "@nestjs/swagger";
import { plainToInstance } from "class-transformer";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { ErrorWithCode, getHttpStatusCode } from "@calcom/platform-libraries/errors";

@Controller({
  path: "/v2/auth/oauth2",
  version: API_VERSIONS_VALUES,
})
@ApiExcludeController(true)
@ApiTags("OAuth2")
export class OAuth2TokenController {
  private readonly logger = new Logger("OAuth2TokenController");

  constructor(private readonly oAuthService: OAuthService) {}

  @Post("/token")
  @HttpCode(HttpStatus.OK)
  @ApiConsumes("application/x-www-form-urlencoded", "application/json")
  @ApiOperation({
    summary: "OAuth2 token",
    description: "Exchanges an authorization code or refresh token for access and refresh tokens",
  })
  async token(@Body() body: OAuth2TokenInput): Promise<OAuth2TokensResponseDto> {
    try {
      let tokens;

      if (body.grant_type === "authorization_code") {
        if (!body.code || !body.redirect_uri) {
          throw new HttpException("invalid_request", HttpStatus.BAD_REQUEST);
        }

        tokens = await this.oAuthService.exchangeCodeForTokens(
          body.client_id,
          body.code,
          body.client_secret,
          body.redirect_uri,
          body.code_verifier
        );
      } else if (body.grant_type === "refresh_token") {
        if (!body.refresh_token) {
          throw new HttpException("invalid_request", HttpStatus.BAD_REQUEST);
        }

        tokens = await this.oAuthService.refreshAccessToken(
          body.client_id,
          body.refresh_token,
          body.client_secret
        );
      } else {
        throw new HttpException("unsupported_grant_type", HttpStatus.BAD_REQUEST);
      }

      return {
        status: SUCCESS_STATUS,
        data: plainToInstance(OAuth2TokensDto, tokens, { strategy: "excludeAll" }),
      };
    } catch (err: unknown) {
      if (err instanceof ErrorWithCode) {
        const statusCode = getHttpStatusCode(err);
        throw new HttpException(err.message, statusCode);
      }
      if (err instanceof HttpException) {
        throw err;
      }
      this.logger.error(err);
      throw new InternalServerErrorException("Could not issue OAuth2 tokens");
    }
  }
}
