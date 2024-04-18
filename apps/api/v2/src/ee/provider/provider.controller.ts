import { ProviderVerifyAccessTokenOutput } from "@/ee/provider/outputs/verify-access-token.output";
import { ProviderVerifyClientOutput } from "@/ee/provider/outputs/verify-client.output";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { AccessTokenGuard } from "@/modules/auth/guards/access-token/access-token.guard";
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
import { ApiTags as DocsTags } from "@nestjs/swagger";

import { SUCCESS_STATUS } from "@calcom/platform-constants";

@Controller({
  path: "/provider",
  version: "2",
})
@DocsTags("Cal provider")
export class CalProviderController {
  constructor(private readonly oauthClientRepository: OAuthClientRepository) {}

  @Get("/:clientId")
  @HttpCode(HttpStatus.OK)
  async verifyClientId(@Param("clientId") clientId: string): Promise<ProviderVerifyClientOutput> {
    if (!clientId) {
      throw new NotFoundException();
    }
    const oAuthClient = await this.oauthClientRepository.getOAuthClient(clientId);

    if (!oAuthClient) throw new UnauthorizedException();

    return {
      status: SUCCESS_STATUS,
    };
  }

  @Get("/:clientId/access-token")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
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
