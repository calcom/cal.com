import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { AccessTokenGuard } from "@/modules/auth/guards/access-token/access-token.guard";
import { CreateManagedUserOutput } from "@/modules/oauth-clients/controllers/oauth-client-users/outputs/create-managed-user.output";
import { DeleteManagedUserOutput } from "@/modules/oauth-clients/controllers/oauth-client-users/outputs/delete-managed-user.output";
import { GetManagedUserOutput } from "@/modules/oauth-clients/controllers/oauth-client-users/outputs/get-managed-user.output";
import { GetManagedUsersOutput } from "@/modules/oauth-clients/controllers/oauth-client-users/outputs/get-managed-users.output";
import { ManagedUserOutput } from "@/modules/oauth-clients/controllers/oauth-client-users/outputs/managed-user.output";
import { UpdateManagedUserOutput } from "@/modules/oauth-clients/controllers/oauth-client-users/outputs/update-managed-user.output";
import { OAuthClientCredentialsGuard } from "@/modules/oauth-clients/guards/oauth-client-credentials/oauth-client-credentials.guard";
import { OAuthClientRepository } from "@/modules/oauth-clients/oauth-client.repository";
import { OAuthClientUsersService } from "@/modules/oauth-clients/services/oauth-clients-users.service";
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
  NotFoundException,
  Param,
  Patch,
  BadRequestException,
  Delete,
  Query,
} from "@nestjs/common";
import { ApiTags as DocsTags } from "@nestjs/swagger";
import { User } from "@prisma/client";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { Pagination } from "@calcom/platform-types";

@Controller({
  path: "oauth-clients/:clientId/users",
  version: "2",
})
@DocsTags("Managed users")
export class OAuthClientUsersController {
  private readonly logger = new Logger("UserController");

  constructor(
    private readonly userRepository: UsersRepository,
    private readonly oAuthClientUsersService: OAuthClientUsersService,
    private readonly oauthRepository: OAuthClientRepository
  ) {}

  @Get("/")
  @UseGuards(OAuthClientCredentialsGuard)
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
      data: existingUsers.map((user) => getResponseUser(user)),
    };
  }

  @Post("/")
  @UseGuards(OAuthClientCredentialsGuard)
  async createUser(
    @Param("clientId") oAuthClientId: string,
    @Body() body: CreateManagedUserInput
  ): Promise<CreateManagedUserOutput> {
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
        user: getResponseUser(user),
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
  ): Promise<GetManagedUserOutput> {
    if (accessTokenUserId !== userId) {
      throw new BadRequestException("userId parameter does not match access token");
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }

    return {
      status: SUCCESS_STATUS,
      data: getResponseUser(user),
    };
  }

  @Patch("/:userId")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AccessTokenGuard)
  async updateUser(
    // @Param("clientId") is added to generate OpenAPI schema correctly: clientId is in @Controller path, and unless
    // also added here as @Param, then it does not appear in OpenAPI schema.
    @Param("clientId") oAuthClientId: string,
    @GetUser("id") accessTokenUserId: number,
    @Param("userId") userId: number,
    @Body() body: UpdateManagedUserInput
  ): Promise<UpdateManagedUserOutput> {
    if (accessTokenUserId !== userId) {
      throw new BadRequestException("userId parameter does not match access token");
    }

    this.logger.log(`Updating user with ID ${userId}: ${JSON.stringify(body, null, 2)}`);

    const user = await this.oAuthClientUsersService.updateOAuthClientUser(oAuthClientId, userId, body);

    return {
      status: SUCCESS_STATUS,
      data: getResponseUser(user),
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
  ): Promise<DeleteManagedUserOutput> {
    if (accessTokenUserId !== userId) {
      throw new BadRequestException("userId parameter does not match access token");
    }

    this.logger.log(`Deleting user with ID: ${userId}`);

    const existingUser = await this.userRepository.findById(userId);

    if (!existingUser) {
      throw new NotFoundException(`User with ID=${userId} does not exist`);
    }

    if (!existingUser.isPlatformManaged) {
      throw new BadRequestException(`Can't delete non managed user with ID=${userId}`);
    }

    const user = await this.userRepository.delete(userId);

    return {
      status: SUCCESS_STATUS,
      data: getResponseUser(user),
    };
  }
}

function getResponseUser(user: User): ManagedUserOutput {
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

export type UserReturned = Pick<User, "id" | "email" | "username">;

export type CreateUserResponse = { user: UserReturned; accessToken: string; refreshToken: string };
