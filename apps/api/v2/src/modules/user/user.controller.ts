import { OAuthClientGuard } from "@/modules/oauth/guard/oauth-client/oauth-client.guard";
import { CreateUserInput } from "@/modules/user/input/create-user";
import { UserRepository } from "@/modules/user/user.repository";
import { Body, Controller, Post, Logger, UseGuards } from "@nestjs/common";
import { User } from "@prisma/client";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiResponse } from "@calcom/platform-types";

@Controller({
  path: "users",
  version: "2",
})
export class UserController {
  private readonly logger = new Logger("UserController");

  // TODO: Inject service for access and refresh tokens
  constructor(private readonly userRepository: UserRepository) {}

  @Post("/")
  @UseGuards(OAuthClientGuard)
  async createUser(
    @Body() body: CreateUserInput
  ): Promise<ApiResponse<{ user: Partial<User>; accessToken: string; refreshToken: string }>> {
    this.logger.log(`Creating user with data: ${JSON.stringify(body, null, 2)}`);

    const user = await this.userRepository.create(body);
    // TODO: User service for access and refresh tokens
    // const { accessToken, refreshToken } = await this.tokenService.generateTokens(user);

    return {
      status: SUCCESS_STATUS,
      data: {
        user,
        accessToken: "accessToken",
        refreshToken: "refreshToken",
      },
    };
  }
}
