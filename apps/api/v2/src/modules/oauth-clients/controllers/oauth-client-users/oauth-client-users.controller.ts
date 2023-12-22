import { GetUser } from "@/modules/auth/decorators";
import { AccessTokenGuard } from "@/modules/auth/guards/access-token/access-token.guard";
import { OAuthClientCredentialsGuard } from "@/modules/oauth-clients/guards/oauth-client-credentials/oauth-client-credentials.guard";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
import { CreateUserInput } from "@/modules/users/inputs/create-user.input";
import { UpdateUserInput } from "@/modules/users/inputs/update-user.input";
import { UsersRepository } from "@/modules/users/users.repository";
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

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiResponse } from "@calcom/platform-types";

@Controller({
  path: "oauth-clients/:clientId/users",
  version: "2",
})
export class OAuthClientUsersController {
  private readonly logger = new Logger("UserController");

  constructor(
    private readonly userRepository: UsersRepository,
    private readonly tokensRepository: TokensRepository
  ) {}

  @Post("/")
  @UseGuards(OAuthClientCredentialsGuard)
  async createUser(
    @Param("clientId") oAuthClientId: string,
    @Body() body: CreateUserInput
  ): Promise<ApiResponse<CreateUserResponse>> {
    this.logger.log(
      `Creating user with data: ${JSON.stringify(body, null, 2)} for OAuth Client with ID ${oAuthClientId}`
    );

    const existingUser = await this.userRepository.findByEmail(body.email);

    if (existingUser) {
      throw new BadRequestException("A user with the provided email already exists.");
    }

    const user = await this.userRepository.create(body, oAuthClientId);
    const { accessToken, refreshToken } = await this.tokensRepository.createOAuthTokens(
      oAuthClientId,
      user.id
    );

    return {
      status: SUCCESS_STATUS,
      data: {
        user,
        accessToken: accessToken,
        refreshToken: refreshToken,
      },
    };
  }

  @Get("/:userId")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async getUserById(
    @GetUser("id") accessTokenUserId: number,
    @Param("userId") userId: number
  ): Promise<ApiResponse<Partial<User>>> {
    if (accessTokenUserId !== userId) {
      throw new BadRequestException("You can only access your own user data.");
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }

    return { status: SUCCESS_STATUS, data: user };
  }

  @Put("/:userId")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async updateUser(
    @GetUser("id") accessTokenUserId: number,
    @Param("userId") userId: number,
    @Body() body: UpdateUserInput
  ): Promise<ApiResponse<Partial<User>>> {
    if (accessTokenUserId !== userId) {
      throw new BadRequestException("You can only update your own user data.");
    }

    this.logger.log(`Updating user with ID ${userId}: ${JSON.stringify(body, null, 2)}`);

    const user = await this.userRepository.update(userId, body);
    return { status: SUCCESS_STATUS, data: user };
  }
}

export type CreateUserResponse = { user: Partial<User>; accessToken: string; refreshToken: string };
