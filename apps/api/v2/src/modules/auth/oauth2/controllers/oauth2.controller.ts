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
  UseFilters,
  UseGuards,
} from "@nestjs/common";
import { ApiBody, ApiExtraModels, ApiOperation, ApiTags, getSchemaPath } from "@nestjs/swagger";
import { plainToInstance } from "class-transformer";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { OAuthService } from "@/lib/services/oauth.service";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { OAuth2HttpExceptionFilter } from "@/modules/auth/oauth2/filters/oauth2-http-exception.filter";
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
import { OAuth2TokensDto } from "@/modules/auth/oauth2/outputs/oauth2-tokens.output";
import { OAuth2ErrorService } from "@/modules/auth/oauth2/services/oauth2-error.service";

@Controller({
  path: "/v2/auth/oauth2",
  version: API_VERSIONS_VALUES,
})
@ApiTags("OAuth2")
export class OAuth2Controller {
  constructor(
    private readonly oAuthService: OAuthService,
    private readonly errorHandler: OAuth2ErrorService
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
      this.errorHandler.handleClientError(err, "Failed to retrieve OAuth client");
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
  @UseFilters(OAuth2HttpExceptionFilter)
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
