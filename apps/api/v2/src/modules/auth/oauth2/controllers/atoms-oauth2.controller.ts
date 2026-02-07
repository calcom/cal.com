import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { ErrorWithCode, getHttpStatusCode } from "@calcom/platform-libraries/errors";
import {
  Controller,
  Get,
  HttpCode,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Param,
} from "@nestjs/common";
import { ApiExcludeController, ApiOperation, ApiTags } from "@nestjs/swagger";

import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { OAuthService } from "@/lib/services/oauth.service";

@Controller({
  path: "/v2/atoms/auth/oauth2/clients/:clientId",
  version: API_VERSIONS_VALUES,
})
@ApiExcludeController(true)
@ApiTags("OAuth2")
export class AtomsOAuth2Controller {
  private readonly logger = new Logger("AtomsOAuth2Controller");

  constructor(private readonly oAuthService: OAuthService) {}

  @Get("/")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get a provider" })
  async getClient(@Param("clientId") clientId: string) {
    if (!clientId) {
      throw new NotFoundException();
    }
    try {
      const client = await this.oAuthService.getClient(clientId);

      return {
        status: SUCCESS_STATUS,
        data: {
          clientId: client.clientId,
          organizationId: null,
        },
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
}
