import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { AccessTokenGuard } from "@/modules/auth/guards/access-token/access-token.guard";
import { UserRepository } from "@/modules/user/user.repository";
import { Controller, Logger, Get, HttpStatus, HttpCode, UseGuards } from "@nestjs/common";
import { User } from "@prisma/client";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiResponse } from "@calcom/platform-types";

@Controller({
  path: "me",
  version: "2",
})
export class UserController {
  private readonly logger = new Logger("UserController");

  constructor(private readonly userRepository: UserRepository) {}

  @Get("/")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async getUser(@GetUser() user: UserReturned): Promise<ApiResponse<UserReturned>> {
    this.logger.log(`Here's the user that the client has requested:`, user);

    return {
      status: SUCCESS_STATUS,
      data: { user },
    };
  }
}

export type UserReturned = Pick<User, "id" | "email">;
