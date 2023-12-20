import { AccessTokenGuard } from "@/modules/auth/guard/access-token/access-token.guard";
import { OAuthClientGuard } from "@/modules/oauth/guard/oauth-client/oauth-client.guard";
import { CreateUserInput } from "@/modules/user/input/create-user";
import { UpdateUserInput } from "@/modules/user/input/update-user";
import { UserRepository } from "@/modules/user/user.repository";
import {
  Body,
  Controller,
  Post,
  Logger,
  UseGuards,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Put,
  BadRequestException,
} from "@nestjs/common";
import { User } from "@prisma/client";

import { DUPLICATE_RESOURCE, SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiResponse } from "@calcom/platform-types";

@Controller({
  path: "oauth-clients/:clientId/users",
  version: "2",
})
export class OAuthUserController {
  private readonly logger = new Logger("UserController");

  // TODO: Inject service for access and refresh tokens
  constructor(private readonly userRepository: UserRepository) {}

  @Post("/")
  @UseGuards(OAuthClientGuard)
  async createUser(
    @Param("clientId") oAuthClientId: string,
    @Body() body: CreateUserInput
  ): Promise<ApiResponse<CreateUserResponse>> {
    this.logger.log(
      `Creating user with data: ${JSON.stringify(body, null, 2)} for OAuth Client with ID ${oAuthClientId}`
    );

    const exists = await this.userRepository.findByEmail(body.email);

    if (exists) {
      throw new BadRequestException(DUPLICATE_RESOURCE);
    }

    const user = await this.userRepository.create(body, oAuthClientId);
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

  @Get("/:userId")
  @HttpCode(HttpStatus.OK)
  // TODO: Use Erik's AccessTokenGuard
  @UseGuards(AccessTokenGuard)
  async getUserById(@Param("userId") userId: number): Promise<ApiResponse<Partial<User>>> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    return { status: SUCCESS_STATUS, data: user };
  }

  @Put("/:userId")
  @HttpCode(HttpStatus.OK)
  // TODO: Use Erik's AccessTokenGuard
  @UseGuards(AccessTokenGuard)
  async updateUser(
    @Param("userId") userId: number,
    @Body() body: UpdateUserInput
  ): Promise<ApiResponse<Partial<User>>> {
    this.logger.log(`Updating user with ID ${userId}: ${JSON.stringify(body, null, 2)}`);

    const user = await this.userRepository.update(userId, body);
    return { status: SUCCESS_STATUS, data: user };
  }
}

export type CreateUserResponse = { user: Partial<User>; accessToken: string; refreshToken: string };
