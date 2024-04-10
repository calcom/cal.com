import { KeysResponseDto } from "@/modules/oauth-clients/controllers/oauth-flow/responses/KeysResponse.dto";
import { OAuthClientCredentialsGuard } from "@/modules/oauth-clients/guards/oauth-client-credentials/oauth-client-credentials.guard";
import { OAuthClientRepository } from "@/modules/oauth-clients/oauth-client.repository";
import { OAuthClientUsersService } from "@/modules/oauth-clients/services/oauth-clients-users.service";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
import { CreateManagedPlatformUserInput } from "@/modules/users/inputs/create-managed-platform-user.input";
import { UpdateManagedPlatformUserInput } from "@/modules/users/inputs/update-managed-platform-user.input";
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
  Param,
  Patch,
  BadRequestException,
  Delete,
  Query,
  NotFoundException,
} from "@nestjs/common";
import { User } from "@prisma/client";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiResponse, Pagination } from "@calcom/platform-types";

@Controller({
  path: "oauth-clients/:clientId/users",
  version: "2",
})
@UseGuards(OAuthClientCredentialsGuard)
export class OAuthClientUsersController {
  private readonly logger = new Logger("UserController");

  constructor(
    private readonly userRepository: UsersRepository,
    private readonly oAuthClientUsersService: OAuthClientUsersService,
    private readonly oauthRepository: OAuthClientRepository,
    private readonly tokensRepository: TokensRepository
  ) {}

  @Get("/")
  async getManagedUsers(
    @Param("clientId") oAuthClientId: string,
    @Query() queryParams: Pagination
  ): Promise<ApiResponse<User[]>> {
    this.logger.log(`getting managed users with data for OAuth Client with ID ${oAuthClientId}`);
    const { offset, limit } = queryParams;

    const existingUsers = await this.userRepository.findManagedUsersByOAuthClientId(
      oAuthClientId,
      offset ?? 0,
      limit ?? 50
    );

    return {
      status: SUCCESS_STATUS,
      data: existingUsers,
    };
  }

  @Post("/")
  async createUser(
    @Param("clientId") oAuthClientId: string,
    @Body() body: CreateManagedPlatformUserInput
  ): Promise<ApiResponse<CreateUserResponse>> {
    this.logger.log(
      `Creating user with data: ${JSON.stringify(body, null, 2)} for OAuth Client with ID ${oAuthClientId}`
    );
    const existingUser = await this.userRepository.findByEmail(body.email);

    if (existingUser) {
      throw new BadRequestException("A user with the provided email already exists.");
    }
    const client = await this.oauthRepository.getOAuthClient(oAuthClientId);

    const isPlatformManaged = true;
    const { user, tokens } = await this.oAuthClientUsersService.createOauthClientUser(
      oAuthClientId,
      body,
      isPlatformManaged,
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
  async getUserById(
    @Param("clientId") clientId: string,
    @Param("userId") userId: number
  ): Promise<ApiResponse<UserReturned>> {
    const { id, username, email } = await this.validateManagedUserOwnership(clientId, userId);

    return {
      status: SUCCESS_STATUS,
      data: {
        id,
        email,
        username,
      },
    };
  }

  @Patch("/:userId")
  @HttpCode(HttpStatus.OK)
  async updateUser(
    @Param("clientId") clientId: string,
    @Param("userId") userId: number,
    @Body() body: UpdateManagedPlatformUserInput
  ): Promise<ApiResponse<UserReturned>> {
    await this.validateManagedUserOwnership(clientId, userId);
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
  async deleteUser(
    @Param("clientId") clientId: string,
    @Param("userId") userId: number
  ): Promise<ApiResponse<UserReturned>> {
    const { id, email, username } = await this.validateManagedUserOwnership(clientId, userId);
    await this.userRepository.delete(userId);

    this.logger.warn(`Deleting user with ID: ${userId}`);

    return {
      status: SUCCESS_STATUS,
      data: {
        id,
        email,
        username,
      },
    };
  }

  @Post("/:userId/force-refresh")
  @HttpCode(HttpStatus.OK)
  async forceRefresh(
    @Param("userId") userId: number,
    @Param("clientId") oAuthClientId: string
  ): Promise<KeysResponseDto> {
    this.logger.log(`Forcing new access tokens for managed user with ID ${userId}`);

    const { id } = await this.validateManagedUserOwnership(oAuthClientId, userId);

    const { accessToken, refreshToken } = await this.tokensRepository.createOAuthTokens(
      oAuthClientId,
      id,
      true
    );

    return {
      status: SUCCESS_STATUS,
      data: {
        accessToken,
        refreshToken,
      },
    };
  }

  private async validateManagedUserOwnership(clientId: string, userId: number): Promise<User> {
    const user = await this.userRepository.findByIdWithinPlatformScope(userId, clientId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} is not part of this OAuth client.`);
    }

    return user;
  }
}

export type UserReturned = Pick<User, "id" | "email" | "username">;

export type CreateUserResponse = { user: UserReturned; accessToken: string; refreshToken: string };
