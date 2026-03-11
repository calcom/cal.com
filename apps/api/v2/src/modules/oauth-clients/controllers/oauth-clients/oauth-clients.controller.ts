import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { MembershipRole } from "@calcom/platform-libraries";
import { CreateOAuthClientInput, Pagination, UpdateOAuthClientInput } from "@calcom/platform-types";
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiExcludeEndpoint,
  ApiHeader,
  ApiOperation,
  ApiTags,
  ApiCreatedResponse as DocsCreatedResponse,
} from "@nestjs/swagger";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { API_KEY_HEADER } from "@/lib/docs/headers";
import { GetOrgId } from "@/modules/auth/decorators/get-org-id/get-org-id.decorator";
import { MembershipRoles } from "@/modules/auth/decorators/roles/membership-roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { OrganizationRolesGuard } from "@/modules/auth/guards/organization-roles/organization-roles.guard";
import { GetManagedUsersOutput } from "@/modules/oauth-clients/controllers/oauth-client-users/outputs/get-managed-users.output";
import { CreateOAuthClientResponseDto } from "@/modules/oauth-clients/controllers/oauth-clients/responses/CreateOAuthClientResponse.dto";
import { GetOAuthClientResponseDto } from "@/modules/oauth-clients/controllers/oauth-clients/responses/GetOAuthClientResponse.dto";
import { GetOAuthClientsResponseDto } from "@/modules/oauth-clients/controllers/oauth-clients/responses/GetOAuthClientsResponse.dto";
import { OAuthClientGuard } from "@/modules/oauth-clients/guards/oauth-client-guard";
import { OAuthClientsService } from "@/modules/oauth-clients/services/oauth-clients/oauth-clients.service";
import { OAuthClientUsersOutputService } from "@/modules/oauth-clients/services/oauth-clients-users-output.service";
import { OrganizationsRepository } from "@/modules/organizations/index/organizations.repository";
import { UsersRepository } from "@/modules/users/users.repository";

@Controller({
  path: "/v2/oauth-clients",
  version: API_VERSIONS_VALUES,
})
@ApiTags("Deprecated: Platform OAuth Clients")
@UseGuards(ApiAuthGuard, OrganizationRolesGuard)
@ApiHeader(API_KEY_HEADER)
export class OAuthClientsController {
  private readonly logger = new Logger("OAuthClientController");

  constructor(
    private readonly oAuthClientUsersOutputService: OAuthClientUsersOutputService,
    private readonly oAuthClientsService: OAuthClientsService,
    private readonly userRepository: UsersRepository,
    private readonly teamsRepository: OrganizationsRepository
  ) {}

  @Post("/")
  @HttpCode(HttpStatus.CREATED)
  @MembershipRoles([MembershipRole.ADMIN, MembershipRole.OWNER])
  @DocsCreatedResponse({
    description: "Create an OAuth client",
    type: CreateOAuthClientResponseDto,
  })
  @ApiOperation({
    summary: "Create an OAuth client",
    description: `<Warning>These endpoints are deprecated and will be removed in the future.</Warning>`,
  })
  async createOAuthClient(
    @GetOrgId() organizationId: number,
    @Body() body: CreateOAuthClientInput
  ): Promise<CreateOAuthClientResponseDto> {
    this.logger.log(`Creating OAuth Client for organisation ${organizationId}`);

    const organization = await this.teamsRepository.findByIdIncludeBilling(organizationId);
    if (!organization?.platformBilling || !organization?.platformBilling?.subscriptionId) {
      throw new BadRequestException(
        "Team is not subscribed to platform plan, cannot create an OAuth Client."
      );
    }

    const oAuthClientCredentials = await this.oAuthClientsService.createOAuthClient(organizationId, body);

    return {
      status: SUCCESS_STATUS,
      data: oAuthClientCredentials,
    };
  }

  @Get("/")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get all OAuth clients",
    description: `<Warning>These endpoints are deprecated and will be removed in the future.</Warning>`,
  })
  @MembershipRoles([MembershipRole.ADMIN, MembershipRole.OWNER, MembershipRole.MEMBER])
  async getOAuthClients(@GetOrgId() organizationId: number): Promise<GetOAuthClientsResponseDto> {
    const clients = await this.oAuthClientsService.getOAuthClients(organizationId);
    return { status: SUCCESS_STATUS, data: clients };
  }

  @Get("/:clientId")
  @HttpCode(HttpStatus.OK)
  @MembershipRoles([MembershipRole.ADMIN, MembershipRole.OWNER, MembershipRole.MEMBER])
  @UseGuards(OAuthClientGuard)
  @ApiOperation({
    summary: "Get an OAuth client",
    description: `<Warning>These endpoints are deprecated and will be removed in the future.</Warning>`,
  })
  async getOAuthClientById(@Param("clientId") clientId: string): Promise<GetOAuthClientResponseDto> {
    const client = await this.oAuthClientsService.getOAuthClientById(clientId);
    return { status: SUCCESS_STATUS, data: client };
  }

  @Get("/:clientId/managed-users")
  @HttpCode(HttpStatus.OK)
  @MembershipRoles([MembershipRole.ADMIN, MembershipRole.OWNER, MembershipRole.MEMBER])
  @UseGuards(OAuthClientGuard)
  // note(Lauris): Excluding this endpoint because we have oauth-clients-users.controller to fetch oAuth users and I am leaving this endpoint
  // just in case someone is using it.
  @ApiExcludeEndpoint()
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

    return {
      status: SUCCESS_STATUS,
      data: existingManagedUsers.map((user) => this.oAuthClientUsersOutputService.getResponseUser(user)),
    };
  }

  @Patch("/:clientId")
  @HttpCode(HttpStatus.OK)
  @MembershipRoles([MembershipRole.ADMIN, MembershipRole.OWNER])
  @UseGuards(OAuthClientGuard)
  @ApiOperation({
    summary: "Update an OAuth client",
    description: `<Warning>These endpoints are deprecated and will be removed in the future.</Warning>`,
  })
  async updateOAuthClient(
    @Param("clientId") clientId: string,
    @Body() body: UpdateOAuthClientInput
  ): Promise<GetOAuthClientResponseDto> {
    this.logger.log(`Updating OAuth Client ${clientId}`);
    const client = await this.oAuthClientsService.updateOAuthClient(clientId, body);
    return { status: SUCCESS_STATUS, data: client };
  }

  @Delete("/:clientId")
  @HttpCode(HttpStatus.OK)
  @MembershipRoles([MembershipRole.ADMIN, MembershipRole.OWNER])
  @UseGuards(OAuthClientGuard)
  @ApiOperation({
    summary: "Delete an OAuth client",
    description: `<Warning>These endpoints are deprecated and will be removed in the future.</Warning>`,
  })
  async deleteOAuthClient(@Param("clientId") clientId: string): Promise<GetOAuthClientResponseDto> {
    this.logger.log(`Deleting OAuth Client with ID: ${clientId}`);
    const client = await this.oAuthClientsService.deleteOAuthClient(clientId);
    return { status: SUCCESS_STATUS, data: client };
  }
}
