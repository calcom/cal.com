import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { GetOrgId } from "@/modules/auth/decorators/get-org-id/get-org-id.decorator";
import { MembershipRoles } from "@/modules/auth/decorators/roles/membership-roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { OrganizationRolesGuard } from "@/modules/auth/guards/organization-roles/organization-roles.guard";
import { GetManagedUsersOutput } from "@/modules/oauth-clients/controllers/oauth-client-users/outputs/get-managed-users.output";
import { ManagedUserOutput } from "@/modules/oauth-clients/controllers/oauth-client-users/outputs/managed-user.output";
import { CreateOAuthClientResponseDto } from "@/modules/oauth-clients/controllers/oauth-clients/responses/CreateOAuthClientResponse.dto";
import { GetOAuthClientResponseDto } from "@/modules/oauth-clients/controllers/oauth-clients/responses/GetOAuthClientResponse.dto";
import { GetOAuthClientsResponseDto } from "@/modules/oauth-clients/controllers/oauth-clients/responses/GetOAuthClientsResponse.dto";
import { OAuthClientGuard } from "@/modules/oauth-clients/guards/oauth-client-guard";
import { OAuthClientRepository } from "@/modules/oauth-clients/oauth-client.repository";
import { OAuthClientsService } from "@/modules/oauth-clients/services/oauth-clients/oauth-clients.service";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";
import { UsersRepository } from "@/modules/users/users.repository";
import {
  Body,
  Controller,
  Query,
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
  BadRequestException,
} from "@nestjs/common";
import {
  ApiOperation as DocsOperation,
  ApiCreatedResponse as DocsCreatedResponse,
  ApiTags,
} from "@nestjs/swagger";
import { User, MembershipRole } from "@prisma/client";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { CreateOAuthClientInput, UpdateOAuthClientInput, Pagination } from "@calcom/platform-types";

const AUTH_DOCUMENTATION = `⚠️ First, this endpoint requires \`Cookie: next-auth.session-token=eyJhbGciOiJ\` header. Log into Cal web app using owner of organization that was created after visiting \`/settings/organizations/new\`, refresh swagger docs, and the cookie will be added to requests automatically to pass the NextAuthGuard.
Second, make sure that the logged in user has organizationId set to pass the OrganizationRolesGuard guard.`;

@Controller({
  path: "/v2/oauth-clients",
  version: API_VERSIONS_VALUES,
})
@ApiTags("OAuth Clients")
@UseGuards(ApiAuthGuard, OrganizationRolesGuard)
export class OAuthClientsController {
  private readonly logger = new Logger("OAuthClientController");

  constructor(
    private readonly oauthClientRepository: OAuthClientRepository,
    private readonly oAuthClientsService: OAuthClientsService,
    private readonly userRepository: UsersRepository,
    private readonly teamsRepository: OrganizationsRepository
  ) {}

  @Post("/")
  @HttpCode(HttpStatus.CREATED)
  @MembershipRoles([MembershipRole.ADMIN, MembershipRole.OWNER])
  @DocsOperation({ description: AUTH_DOCUMENTATION })
  @DocsCreatedResponse({
    description: "Create an OAuth client",
    type: CreateOAuthClientResponseDto,
  })
  async createOAuthClient(
    @GetOrgId() organizationId: number,
    @Body() body: CreateOAuthClientInput
  ): Promise<CreateOAuthClientResponseDto> {
    this.logger.log(
      `For organisation ${organizationId} creating OAuth Client with data: ${JSON.stringify(body)}`
    );

    const organization = await this.teamsRepository.findByIdIncludeBilling(organizationId);
    if (!organization?.platformBilling || !organization?.platformBilling?.subscriptionId) {
      throw new BadRequestException("Team is not subscribed, cannot create an OAuth Client.");
    }

    const oAuthClientCredentials = await this.oAuthClientsService.createOAuthClient(organizationId, body);

    return {
      status: SUCCESS_STATUS,
      data: oAuthClientCredentials,
    };
  }

  @Get("/")
  @HttpCode(HttpStatus.OK)
  @MembershipRoles([MembershipRole.ADMIN, MembershipRole.OWNER, MembershipRole.MEMBER])
  @DocsOperation({ description: AUTH_DOCUMENTATION })
  async getOAuthClients(@GetOrgId() organizationId: number): Promise<GetOAuthClientsResponseDto> {
    const clients = await this.oAuthClientsService.getOAuthClients(organizationId);
    return { status: SUCCESS_STATUS, data: clients };
  }

  @Get("/:clientId")
  @HttpCode(HttpStatus.OK)
  @MembershipRoles([MembershipRole.ADMIN, MembershipRole.OWNER, MembershipRole.MEMBER])
  @DocsOperation({ description: AUTH_DOCUMENTATION })
  @UseGuards(OAuthClientGuard)
  async getOAuthClientById(@Param("clientId") clientId: string): Promise<GetOAuthClientResponseDto> {
    const client = await this.oAuthClientsService.getOAuthClientById(clientId);
    return { status: SUCCESS_STATUS, data: client };
  }

  @Get("/:clientId/managed-users")
  @HttpCode(HttpStatus.OK)
  @MembershipRoles([MembershipRole.ADMIN, MembershipRole.OWNER, MembershipRole.MEMBER])
  @DocsOperation({ description: AUTH_DOCUMENTATION })
  @UseGuards(OAuthClientGuard)
  async getOAuthClientManagedUsersById(
    @Param("clientId") clientId: string,
    @Query() queryParams: Pagination
  ): Promise<GetManagedUsersOutput> {
    const { offset, limit } = queryParams;
    const existingManagedUsers = await this.userRepository.findManagedUsersByOAuthClientId(
      clientId,
      offset ?? 0,
      limit ?? 50
    );

    return { status: SUCCESS_STATUS, data: existingManagedUsers.map((user) => this.getResponseUser(user)) };
  }

  @Patch("/:clientId")
  @HttpCode(HttpStatus.OK)
  @MembershipRoles([MembershipRole.ADMIN, MembershipRole.OWNER])
  @DocsOperation({ description: AUTH_DOCUMENTATION })
  @UseGuards(OAuthClientGuard)
  async updateOAuthClient(
    @Param("clientId") clientId: string,
    @Body() body: UpdateOAuthClientInput
  ): Promise<GetOAuthClientResponseDto> {
    this.logger.log(`For client ${clientId} updating OAuth Client with data: ${JSON.stringify(body)}`);
    const client = await this.oAuthClientsService.updateOAuthClient(clientId, body);
    return { status: SUCCESS_STATUS, data: client };
  }

  @Delete("/:clientId")
  @HttpCode(HttpStatus.OK)
  @MembershipRoles([MembershipRole.ADMIN, MembershipRole.OWNER])
  @DocsOperation({ description: AUTH_DOCUMENTATION })
  @UseGuards(OAuthClientGuard)
  async deleteOAuthClient(@Param("clientId") clientId: string): Promise<GetOAuthClientResponseDto> {
    this.logger.log(`Deleting OAuth Client with ID: ${clientId}`);
    const client = await this.oAuthClientsService.deleteOAuthClient(clientId);
    return { status: SUCCESS_STATUS, data: client };
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
    };
  }
}
