import { AtomsRepository } from "@/modules/atoms/atoms.repository";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { AccessTokenGuard } from "@/modules/auth/guards/access-token/access-token.guard";
import { UsersRepository } from "@/modules/users/users.repository";
import { Controller, Logger, Get, HttpStatus, HttpCode, Param, UseGuards } from "@nestjs/common";
import { User } from "@prisma/client";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiResponse } from "@calcom/platform-types";

@Controller({
  path: "atoms",
  version: "2",
})
export class UserController {
  private readonly logger = new Logger("UserController");

  constructor(
    private readonly atomsRepository: AtomsRepository,
    private readonly userRepository: UsersRepository
  ) {}

  @Get("/verifyClientId/:clientId")
  @HttpCode(HttpStatus.OK)
  async verifyClientId(@Param("clientId") userClientId: number): Promise<ApiResponse<ClientKeyUserReturned>> {
    const user = await this.userRepository.findById(userClientId);
    const isKeyValid = !!user;

    this.logger.log(`Here's the user that the client has requested:`, user);

    return {
      status: SUCCESS_STATUS,
      data: {
        isKeyValid,
      },
    };
  }

  @Get("/verifyAccessToken/:clientToken")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async verifyClientToken(@GetUser() user: UserReturned): Promise<ApiResponse<AccessTokenUserReturned>> {
    const isAccessTokenValid = !!user;

    this.logger.log(`Here's the user that the client has requested:`, user);

    return {
      status: SUCCESS_STATUS,
      data: {
        isAccessTokenValid,
      },
    };
  }
}

export type ClientKeyUserReturned = { isKeyValid: boolean };
export type AccessTokenUserReturned = { isAccessTokenValid: boolean };
export type UserReturned = Pick<User, "id" | "email">;
