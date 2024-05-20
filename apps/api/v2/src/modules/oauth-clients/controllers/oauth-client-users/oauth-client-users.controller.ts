import { CreateManagedUserOutput } from "@/modules/oauth-clients/controllers/oauth-client-users/outputs/create-managed-user.output";
import { GetManagedUserOutput } from "@/modules/oauth-clients/controllers/oauth-client-users/outputs/get-managed-user.output";
import { GetManagedUsersOutput } from "@/modules/oauth-clients/controllers/oauth-client-users/outputs/get-managed-users.output";
import { ManagedUserOutput } from "@/modules/oauth-clients/controllers/oauth-client-users/outputs/managed-user.output";
import { KeysResponseDto } from "@/modules/oauth-clients/controllers/oauth-flow/responses/KeysResponse.dto";
import { OAuthClientCredentialsGuard } from "@/modules/oauth-clients/guards/oauth-client-credentials/oauth-client-credentials.guard";
import { OAuthClientRepository } from "@/modules/oauth-clients/oauth-client.repository";
import { OAuthClientUsersService } from "@/modules/oauth-clients/services/oauth-clients-users.service";
import { TokensRepository } from "@/modules/tokens/tokens.repository";
import { CreateManagedUserInput } from "@/modules/users/inputs/create-managed-user.input";
import { UpdateManagedUserInput } from "@/modules/users/inputs/update-managed-user.input";
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
import { ApiTags as DocsTags } from "@nestjs/swagger";
import { User } from "@prisma/client";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { Pagination } from "@calcom/platform-types";

@Controller({
  path: "oauth-clients/:clientId/users",
  version: "2",
})
@UseGuards(OAuthClientCredentialsGuard)
@DocsTags("Managed users")
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
  ): Promise<GetManagedUsersOutput> {
    this.logger.log(`getting managed users with data for OAuth Client with ID ${oAuthClientId}`);
    const { offset, limit } = queryParams;

    const existingUsers = await this.userRepository.findManagedUsersByOAuthClientId(
      oAuthClientId,
      offset ?? 0,
      limit ?? 50
    );

    return {
      status: SUCCESS_STATUS,
      data: existingUsers.map((user) => this.getResponseUser(user)),
    };
  }

  @Post("/")
  async createUser(
    @Param("clientId") oAuthClientId: string,
    @Body() body: CreateManagedUserInput
  ): Promise<CreateManagedUserOutput> {
    this.logger.log(
      `Creating user with data: ${JSON.stringify(body, null, 2)} for OAuth Client with ID ${oAuthClientId}`
    );
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
        user: this.getResponseUser(user),
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
  ): Promise<GetManagedUserOutput> {
    const user = await this.validateManagedUserOwnership(clientId, userId);

    return {
      status: SUCCESS_STATUS,
      data: this.getResponseUser(user),
    };
  }

  @Patch("/:userId")
  @HttpCode(HttpStatus.OK)
  async updateUser(
    @Param("clientId") clientId: string,
    @Param("userId") userId: number,
    @Body() body: UpdateManagedUserInput
  ): Promise<GetManagedUserOutput> {
    await this.validateManagedUserOwnership(clientId, userId);
    this.logger.log(`Updating user with ID ${userId}: ${JSON.stringify(body, null, 2)}`);

    const user = await this.oAuthClientUsersService.updateOAuthClientUser(clientId, userId, body);

    return {
      status: SUCCESS_STATUS,
      data: this.getResponseUser(user),
    };
  }

  @Delete("/:userId")
  @HttpCode(HttpStatus.OK)
  async deleteUser(
    @Param("clientId") clientId: string,
    @Param("userId") userId: number
  ): Promise<GetManagedUserOutput> {
    const user = await this.validateManagedUserOwnership(clientId, userId);
    await this.userRepository.delete(userId);

    this.logger.warn(`Deleting user with ID: ${userId}`);

    return {
      status: SUCCESS_STATUS,
      data: this.getResponseUser(user),
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

  private getResponseUser(user: User): ManagedUserOutput {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      timeZone: user.timeZone,
      weekStart: user.weekStart,
      createdDate: user.createdDate,
      timeFormat: user.timeFormat,
      defaultScheduleId: user.defaultScheduleId,
    };
  }
}

export type UserReturned = Pick<User, "id" | "email" | "username">;

export type CreateUserResponse = { user: UserReturned; accessToken: string; refreshToken: string };
