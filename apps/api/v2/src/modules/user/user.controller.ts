import { GetOAuthClient } from "@/modules/oauth/decorator/get-oauth-client/get-oauth-client.decorator";
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
  Delete,
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
    @GetOAuthClient("id") oAuthClientId: string,
    @Body() body: CreateUserInput
  ): Promise<ApiResponse<{ user: Partial<User>; accessToken: string; refreshToken: string }>> {
    this.logger.log(
      `Creating user with data: ${JSON.stringify(body, null, 2)} for OAuth Client ${oAuthClientId}`
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
  async getUserById(@Param("userId") userId: number): Promise<ApiResponse<Partial<User>>> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException("User not found");
    }

    return { status: SUCCESS_STATUS, data: user };
  }

  @Put("/:userId")
  @HttpCode(HttpStatus.OK)
  async updateUser(
    @Param("userId") userId: number,
    @Body() body: UpdateUserInput
  ): Promise<ApiResponse<Partial<User>>> {
    this.logger.log(`Updating user with ID ${userId}: ${JSON.stringify(body, null, 2)}`);

    const user = await this.userRepository.update(userId, body);
    return { status: SUCCESS_STATUS, data: user };
  }

  @Delete("/:userId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(@Param("userId") userId: number): Promise<ApiResponse<Partial<User>>> {
    this.logger.log(`Deleting user with ID: ${userId}`);

    const exists = await this.userRepository.findById(userId);

    if (!exists) {
      throw new NotFoundException(`User with ${userId} does not exist`);
    }

    const user = await this.userRepository.delete(userId);
    return { status: SUCCESS_STATUS, data: user };
  }
}
