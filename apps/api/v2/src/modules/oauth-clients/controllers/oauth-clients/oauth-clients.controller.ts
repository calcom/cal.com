import { getEnv } from "@/env";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { NextAuthGuard } from "@/modules/auth/guards/next-auth/next-auth.guard";
import { OrganizationRolesGuard } from "@/modules/auth/guards/organization-roles/organization-roles.guard";
import { ManagedUserOutput } from "@/modules/oauth-clients/controllers/oauth-client-users/outputs/managed-user.output";
import { CreateOAuthClientResponseDto } from "@/modules/oauth-clients/controllers/oauth-clients/responses/CreateOAuthClientResponse.dto";
import {
  GetOAuthClientResponseDto,
  GetOAuthClientManagedUsersResponseDto,
} from "@/modules/oauth-clients/controllers/oauth-clients/responses/GetOAuthClientResponse.dto";
import { GetOAuthClientsResponseDto } from "@/modules/oauth-clients/controllers/oauth-clients/responses/GetOAuthClientsResponse.dto";
import { UpdateOAuthClientInput } from "@/modules/oauth-clients/inputs/update-oauth-client.input";
import { OAuthClientRepository } from "@/modules/oauth-clients/oauth-client.repository";
import { UserWithProfile } from "@/modules/users/users.repository";
import { UsersRepository } from "@/modules/users/users.repository";
import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
  NotFoundException,
} from "@nestjs/common";
import {
  ApiTags as DocsTags,
  ApiExcludeController as DocsExcludeController,
  ApiOperation as DocsOperation,
  ApiCreatedResponse as DocsCreatedResponse,
} from "@nestjs/swagger";
import { MembershipRole } from "@prisma/client";
import { User } from "@prisma/client";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { CreateOAuthClientInput } from "@calcom/platform-types";

const AUTH_DOCUMENTATION = `⚠️ First, this endpoint requires \`Cookie: next-auth.session-token=eyJhbGciOiJ\` header. Log into Cal web app using owner of organization that was created after visiting \`/settings/organizations/new\`, refresh swagger docs, and the cookie will be added to requests automatically to pass the NextAuthGuard.
Second, make sure that the logged in user has organizationId set to pass the OrganizationRolesGuard guard.`;

@Controller({
  path: "oauth-clients",
  version: "2",
})
@UseGuards(NextAuthGuard, OrganizationRolesGuard)
@DocsExcludeController(getEnv("NODE_ENV") === "production")
@DocsTags("OAuth - development only")
export class OAuthClientsController {
  private readonly logger = new Logger("OAuthClientController");

  constructor(
    private readonly oauthClientRepository: OAuthClientRepository,
    private readonly userRepository: UsersRepository
  ) {}

  @Post("/")
  @HttpCode(HttpStatus.CREATED)
  @Roles([MembershipRole.ADMIN, MembershipRole.OWNER])
  @DocsOperation({ description: AUTH_DOCUMENTATION })
  @DocsCreatedResponse({
    description: "Create an OAuth client",
    type: CreateOAuthClientResponseDto,
  })
  async createOAuthClient(
    @GetUser() user: UserWithProfile,
    @Body() body: CreateOAuthClientInput
  ): Promise<CreateOAuthClientResponseDto> {
    const organizationId = (user.movedToProfile?.organizationId ?? user.organizationId) as number;
    this.logger.log(
      `For organisation ${organizationId} creating OAuth Client with data: ${JSON.stringify(body)}`
    );
    const { id, secret } = await this.oauthClientRepository.createOAuthClient(organizationId, body);
    return {
      status: SUCCESS_STATUS,
      data: {
        clientId: id,
        clientSecret: secret,
      },
    };
  }

  @Get("/")
  @HttpCode(HttpStatus.OK)
  @Roles([MembershipRole.ADMIN, MembershipRole.OWNER, MembershipRole.MEMBER])
  @DocsOperation({ description: AUTH_DOCUMENTATION })
  async getOAuthClients(@GetUser() user: UserWithProfile): Promise<GetOAuthClientsResponseDto> {
    const organizationId = (user.movedToProfile?.organizationId ?? user.organizationId) as number;

    const clients = await this.oauthClientRepository.getOrganizationOAuthClients(organizationId);
    return { status: SUCCESS_STATUS, data: clients };
  }

  @Get("/:clientId")
  @HttpCode(HttpStatus.OK)
  @Roles([MembershipRole.ADMIN, MembershipRole.OWNER, MembershipRole.MEMBER])
  @DocsOperation({ description: AUTH_DOCUMENTATION })
  async getOAuthClientById(@Param("clientId") clientId: string): Promise<GetOAuthClientResponseDto> {
    const client = await this.oauthClientRepository.getOAuthClient(clientId);
    if (!client) {
      throw new NotFoundException(`OAuth client with ID ${clientId} not found`);
    }
    return { status: SUCCESS_STATUS, data: client };
  }

  @Get("/managed-users/:clientId")
  @HttpCode(HttpStatus.OK)
  @Roles([MembershipRole.ADMIN, MembershipRole.OWNER, MembershipRole.MEMBER])
  @DocsOperation({ description: AUTH_DOCUMENTATION })
  async getOAuthClientManagedUsersById(
    @Param("clientId") clientId: string
  ): Promise<GetOAuthClientManagedUsersResponseDto> {
    const existingManagedUsers = await this.userRepository.findManagedUsersByOAuthClientId(clientId, 0, 50); // second argument is for offset while third is for limit

    if (!existingManagedUsers) {
      throw new NotFoundException(`OAuth client with ID ${clientId} does not have any managed users`);
    }
    return { status: SUCCESS_STATUS, data: existingManagedUsers.map((user) => this.getResponseUser(user)) };
  }

  @Patch("/:clientId")
  @HttpCode(HttpStatus.OK)
  @Roles([MembershipRole.ADMIN, MembershipRole.OWNER])
  @DocsOperation({ description: AUTH_DOCUMENTATION })
  async updateOAuthClient(
    @Param("clientId") clientId: string,
    @Body() body: UpdateOAuthClientInput
  ): Promise<GetOAuthClientResponseDto> {
    this.logger.log(`For client ${clientId} updating OAuth Client with data: ${JSON.stringify(body)}`);
    const client = await this.oauthClientRepository.updateOAuthClient(clientId, body);
    return { status: SUCCESS_STATUS, data: client };
  }

  @Delete("/:clientId")
  @HttpCode(HttpStatus.OK)
  @Roles([MembershipRole.ADMIN, MembershipRole.OWNER])
  @DocsOperation({ description: AUTH_DOCUMENTATION })
  async deleteOAuthClient(@Param("clientId") clientId: string): Promise<GetOAuthClientResponseDto> {
    this.logger.log(`Deleting OAuth Client with ID: ${clientId}`);
    const client = await this.oauthClientRepository.deleteOAuthClient(clientId);
    return { status: SUCCESS_STATUS, data: client };
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
