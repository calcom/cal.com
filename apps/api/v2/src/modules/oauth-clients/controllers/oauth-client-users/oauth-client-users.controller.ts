import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { AccessTokenGuard } from "@/modules/auth/guards/access-token/access-token.guard";
import { OAuthClientCredentialsGuard } from "@/modules/oauth-clients/guards/oauth-client-credentials/oauth-client-credentials.guard";
import { OAuthClientRepository } from "@/modules/oauth-clients/oauth-client.repository";
import { OAuthClientUsersService } from "@/modules/oauth-clients/services/oauth-clients-users.service";
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
  Patch,
  BadRequestException,
  Delete,
} from "@nestjs/common";
import { User } from "@prisma/client";
import * as crypto from "crypto";

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
    private readonly oAuthClientUsersService: OAuthClientUsersService,
    private readonly oauthRepository: OAuthClientRepository
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
    const client = await this.oauthRepository.getOAuthClient(oAuthClientId);

    const { user, tokens } = await this.oAuthClientUsersService.createOauthClientUser(
      oAuthClientId,
      body,
      client?.organizationId
    );

    return {
      status: SUCCESS_STATUS,
      data: {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    };
  }

  @Get("/:userId")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async getUserById(
    // @Param("clientId") is added to generate OpenAPI schema correctly: clientId is in @Controller path, and unless
    // also added here as @Param, then it does not appear in OpenAPI schema.
    @Param("clientId") _: string,
    @GetUser("id") accessTokenUserId: number,
    @Param("userId") userId: number
  ): Promise<ApiResponse<UserReturned>> {
    if (accessTokenUserId !== userId) {
      throw new BadRequestException("userId parameter does not match access token");
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }

    return {
      status: SUCCESS_STATUS,
      data: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    };
  }

  @Patch("/:userId")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async updateUser(
    // @Param("clientId") is added to generate OpenAPI schema correctly: clientId is in @Controller path, and unless
    // also added here as @Param, then it does not appear in OpenAPI schema.
    @Param("clientId") _: string,
    @GetUser("id") accessTokenUserId: number,
    @Param("userId") userId: number,
    @Body() body: UpdateUserInput
  ): Promise<ApiResponse<UserReturned>> {
    if (accessTokenUserId !== userId) {
      throw new BadRequestException("userId parameter does not match access token");
    }

    this.logger.log(`Updating user with ID ${userId}: ${JSON.stringify(body, null, 2)}`);

    const user = await this.userRepository.update(userId, body);

    return {
      status: SUCCESS_STATUS,
      data: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    };
  }

  @Delete("/:userId")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async deleteUser(
    // @Param("clientId") is added to generate OpenAPI schema correctly: clientId is in @Controller path, and unless
    // also added here as @Param, then it does not appear in OpenAPI schema.
    @Param("clientId") _: string,
    @GetUser("id") accessTokenUserId: number,
    @Param("userId") userId: number
  ): Promise<ApiResponse<UserReturned>> {
    if (accessTokenUserId !== userId) {
      throw new BadRequestException("userId parameter does not match access token");
    }

    this.logger.log(`Deleting user with ID: ${userId}`);

    const existingUser = await this.userRepository.findById(userId);

    if (!existingUser) {
      throw new NotFoundException(`User with ${userId} does not exist`);
    }

    if (existingUser.username) {
      throw new BadRequestException("Cannot delete a non manually-managed user");
    }

    const user = await this.userRepository.delete(userId);

    return {
      status: SUCCESS_STATUS,
      data: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    };
  }
}

export type UserReturned = Pick<User, "id" | "email" | "username">;

export type CreateUserResponse = { user: UserReturned; accessToken: string; refreshToken: string };
