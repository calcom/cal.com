import { ProviderVerifyAccessTokenOutput } from "@/ee/provider/outputs/verify-access-token.output";
import { ProviderVerifyClientOutput } from "@/ee/provider/outputs/verify-client.output";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { OAuthClientRepository } from "@/modules/oauth-clients/oauth-client.repository";
import { UserWithProfile } from "@/modules/users/users.repository";
import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";

import { SUCCESS_STATUS } from "@calcom/platform-constants";

@Controller({
  path: "/v2/provider",
  version: API_VERSIONS_VALUES,
})
@DocsTags("Platform / Cal Provider")
export class CalProviderController {
  constructor(private readonly oauthClientRepository: OAuthClientRepository) {}

  @Get("/:clientId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get a provider" })
  async verifyClientId(@Param("clientId") clientId: string): Promise<ProviderVerifyClientOutput> {
    if (!clientId) {
      throw new NotFoundException();
    }
    const oAuthClient = await this.oauthClientRepository.getOAuthClient(clientId);

    if (!oAuthClient) throw new UnauthorizedException();

    return {
      status: SUCCESS_STATUS,
      data: {
        clientId: oAuthClient.id,
        organizationId: oAuthClient.organizationId,
        name: oAuthClient.name,
      },
    };
  }

  @Get("/:clientId/access-token")
  @HttpCode(HttpStatus.OK)
  @UseGuards(ApiAuthGuard)
  @ApiOperation({ summary: "Verify an access token" })
  async verifyAccessToken(
    @Param("clientId") clientId: string,
    @GetUser() user: UserWithProfile
  ): Promise<ProviderVerifyAccessTokenOutput> {
    if (!clientId) {
      throw new BadRequestException();
    }

    if (!user) {
      throw new UnauthorizedException();
    }

    return {
      status: SUCCESS_STATUS,
    };
  }
}
