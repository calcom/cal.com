import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { AccessTokenGuard } from "@/modules/auth/guards/access-token/access-token.guard";
import { OAuthClientRepository } from "@/modules/oauth-clients/oauth-client.repository";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
import { UserWithProfile } from "@/modules/users/users.repository";
import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Param,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiResponse } from "@calcom/platform-types";

@Controller({
  path: "ee/provider",
  version: "2",
})
export class CalProviderController {
  private readonly logger = new Logger("Platform Provider Controller");

  constructor(
    private readonly tokensRepository: TokensRepository,
    private readonly oauthClientRepository: OAuthClientRepository
  ) {}

  @Get("/:clientId")
  @HttpCode(HttpStatus.OK)
  async verifyClientId(@Param("clientId") clientId: string): Promise<ApiResponse> {
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
  ): Promise<ApiResponse> {
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
