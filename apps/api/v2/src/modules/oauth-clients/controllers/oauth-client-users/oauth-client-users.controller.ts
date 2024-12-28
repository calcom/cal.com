import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { Locales } from "@/lib/enums/locales";
import { MembershipRoles } from "@/modules/auth/decorators/roles/membership-roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { OrganizationRolesGuard } from "@/modules/auth/guards/organization-roles/organization-roles.guard";
import { CreateManagedUserOutput } from "@/modules/oauth-clients/controllers/oauth-client-users/outputs/create-managed-user.output";
import { GetManagedUserOutput } from "@/modules/oauth-clients/controllers/oauth-client-users/outputs/get-managed-user.output";
import { GetManagedUsersOutput } from "@/modules/oauth-clients/controllers/oauth-client-users/outputs/get-managed-users.output";
import { ManagedUserOutput } from "@/modules/oauth-clients/controllers/oauth-client-users/outputs/managed-user.output";
import { KeysResponseDto } from "@/modules/oauth-clients/controllers/oauth-flow/responses/KeysResponse.dto";
import { OAuthClientGuard } from "@/modules/oauth-clients/guards/oauth-client-guard";
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
  Delete,
  Query,
  NotFoundException,
} from "@nestjs/common";
import { ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";
import { User, MembershipRole } from "@prisma/client";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { Pagination } from "@calcom/platform-types";

@Controller({
  path: "/v2/oauth-clients/:clientId/users",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, OAuthClientGuard, OrganizationRolesGuard)
@DocsTags("Platform / Managed Users")
export class OAuthClientUsersController {
  private readonly logger = new Logger("UserController");

  constructor(
    private readonly userRepository: UsersRepository,
    private readonly oAuthClientUsersService: OAuthClientUsersService,
    private readonly oauthRepository: OAuthClientRepository,
    private readonly tokensRepository: TokensRepository
  ) {}

  @Get("/")
  @ApiOperation({ summary: "Get all managed users" })
  @MembershipRoles([MembershipRole.ADMIN, MembershipRole.OWNER])
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
  @ApiOperation({ summary: "Create a managed user" })
  @MembershipRoles([MembershipRole.ADMIN, MembershipRole.OWNER])
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
        accessTokenExpiresAt: tokens.accessTokenExpiresAt.valueOf(),
        refreshToken: tokens.refreshToken,
      },
    };
  }

  @Get("/:userId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get a managed user" })
  @MembershipRoles([MembershipRole.ADMIN, MembershipRole.OWNER])
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
  @ApiOperation({ summary: "Update a managed user" })
  @MembershipRoles([MembershipRole.ADMIN, MembershipRole.OWNER])
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
  @ApiOperation({ summary: "Delete a managed user" })
  @MembershipRoles([MembershipRole.ADMIN, MembershipRole.OWNER])
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
  @ApiOperation({
    summary: "Force refresh tokens",
    description: `If you have lost managed user access or refresh token, then you can get new ones by using OAuth credentials.
    Each access token is valid for 60 minutes and each refresh token for 1 year. Make sure to store them later in your database, for example, by updating the User model to have \`calAccessToken\` and \`calRefreshToken\` columns.`,
  })
  @MembershipRoles([MembershipRole.ADMIN, MembershipRole.OWNER])
  async forceRefresh(
    @Param("userId") userId: number,
    @Param("clientId") oAuthClientId: string
  ): Promise<KeysResponseDto> {
    this.logger.log(`Forcing new access tokens for managed user with ID ${userId}`);

    const { id } = await this.validateManagedUserOwnership(oAuthClientId, userId);

    const { accessToken, refreshToken, accessTokenExpiresAt } = await this.tokensRepository.createOAuthTokens(
      oAuthClientId,
      id,
      true
    );

    return {
      status: SUCCESS_STATUS,
      data: {
        accessToken,
        refreshToken,
        accessTokenExpiresAt: accessTokenExpiresAt.valueOf(),
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
      name: user.name,
      timeZone: user.timeZone,
      weekStart: user.weekStart,
      createdDate: user.createdDate,
      timeFormat: user.timeFormat,
      defaultScheduleId: user.defaultScheduleId,
      locale: user.locale as Locales,
      avatarUrl: user.avatarUrl,
    };
  }
}
