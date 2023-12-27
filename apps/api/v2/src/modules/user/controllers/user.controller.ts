import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { AccessTokenGuard } from "@/modules/auth/guards/access-token/access-token.guard";
import { GetUserInput } from "@/modules/user/inputs/get-user.input";
import { UserRepository } from "@/modules/user/user.repository";
import { Controller, Logger, Get, HttpStatus, HttpCode, UseGuards, Param } from "@nestjs/common";
import { BadRequestException, Body } from "@nestjs/common";

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
  async getUser(
    @Param("clientId") clientId: string,
    @Body() body: GetUserInput,
    @GetUser() user: any
  ): Promise<ApiResponse<UserReturned>> {
    if (!user) {
      throw new BadRequestException("This user does not exist.");
    }

    this.logger.log(`Here's the user that the client has requested:`, user);

    return {
      status: SUCCESS_STATUS,
      data: { user },
    };
  }
}

export type UserReturned = any;
