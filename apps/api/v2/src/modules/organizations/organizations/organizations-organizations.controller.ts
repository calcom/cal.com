import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { SkipTakePagination } from "@calcom/platform-types";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { X_CAL_CLIENT_ID_HEADER, X_CAL_SECRET_KEY_HEADER } from "@/lib/docs/headers";
import { Throttle } from "@/lib/endpoint-throttler-decorator";
import { PlatformPlan } from "@/modules/auth/decorators/billing/platform-plan.decorator";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PlatformPlanGuard } from "@/modules/auth/guards/billing/platform-plan.guard";
import { IsAdminAPIEnabledGuard } from "@/modules/auth/guards/organizations/is-admin-api-enabled.guard";
import { IsManagedOrgInManagerOrg } from "@/modules/auth/guards/organizations/is-managed-org-in-manager-org.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { ApiAuthGuardUser } from "@/modules/auth/strategies/api-auth/api-auth.strategy";
import { CreateOrganizationInput } from "@/modules/organizations/organizations/inputs/create-managed-organization.input";
import { GetManagedOrganizationsInput_2024_08_13 } from "@/modules/organizations/organizations/inputs/get-managed-organizations.input";
import { UpdateOrganizationInput } from "@/modules/organizations/organizations/inputs/update-managed-organization.input";
import { CreateManagedOrganizationOutput } from "@/modules/organizations/organizations/outputs/create-managed-organization.output";
import { GetManagedOrganizationOutput } from "@/modules/organizations/organizations/outputs/get-managed-organization.output";
import { GetManagedOrganizationsOutput } from "@/modules/organizations/organizations/outputs/get-managed-organizations.output";
import { ManagedOrganizationsService } from "@/modules/organizations/organizations/services/managed-organizations.service";

const SCALE = "SCALE";

@Controller({
  path: "/v2/organizations/:orgId/organizations",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, PlatformPlanGuard, IsAdminAPIEnabledGuard)
@DocsTags("Managed Orgs")
@ApiHeader(X_CAL_CLIENT_ID_HEADER)
@ApiHeader(X_CAL_SECRET_KEY_HEADER)
export class OrganizationsOrganizationsController {
  constructor(private readonly managedOrganizationsService: ManagedOrganizationsService) {}

  @Post()
  @Roles("ORG_ADMIN")
  @PlatformPlan(SCALE)
  @ApiOperation({
    summary: "Create an organization within an organization",
    description:
      "Requires the user to have at least the 'ORG_ADMIN' role within the organization. Additionally, for platform, the plan must be 'SCALE' or higher to access this endpoint.",
  })
  async createOrganization(
    @Param("orgId", ParseIntPipe) managerOrganizationId: number,
    @GetUser() authUser: ApiAuthGuardUser,
    @Body() body: CreateOrganizationInput
  ): Promise<CreateManagedOrganizationOutput> {
    const organization = await this.managedOrganizationsService.createManagedOrganization(
      authUser,
      managerOrganizationId,
      body
    );

    return {
      status: SUCCESS_STATUS,
      data: organization,
    };
  }

  @Roles("ORG_ADMIN")
  @PlatformPlan(SCALE)
  @Get("/:managedOrganizationId")
  @ApiOperation({
    summary: "Get an organization within an organization",
    description:
      "Requires the user to have at least the 'ORG_ADMIN' role within the organization. Additionally, for platform, the plan must be 'SCALE' or higher to access this endpoint.",
  })
  @UseGuards(IsManagedOrgInManagerOrg)
  async getOrganization(
    @Param("managedOrganizationId", ParseIntPipe) managedOrganizationId: number
  ): Promise<GetManagedOrganizationOutput> {
    const organization = await this.managedOrganizationsService.getManagedOrganization(managedOrganizationId);
    return {
      status: SUCCESS_STATUS,
      data: organization,
    };
  }

  @Roles("ORG_ADMIN")
  @PlatformPlan(SCALE)
  @Get("/")
  @ApiOperation({
    summary: "Get all organizations within an organization",
    description:
      "Requires the user to have at least the 'ORG_ADMIN' role within the organization. Additionally, for platform, the plan must be 'SCALE' or higher to access this endpoint.",
  })
  async getOrganizations(
    @Param("orgId", ParseIntPipe) managerOrganizationId: number,
    @Query() query: GetManagedOrganizationsInput_2024_08_13
  ): Promise<GetManagedOrganizationsOutput> {
    const { organizations, pagination: responsePagination } =
      await this.managedOrganizationsService.getManagedOrganizations(managerOrganizationId, query);
    return {
      status: SUCCESS_STATUS,
      data: organizations,
      pagination: responsePagination,
    };
  }

  @Roles("ORG_ADMIN")
  @PlatformPlan(SCALE)
  @Patch("/:managedOrganizationId")
  @ApiOperation({
    summary: "Update an organization within an organization",
    description:
      "Requires the user to have at least the 'ORG_ADMIN' role within the organization. Additionally, for platform, the plan must be 'SCALE' or higher to access this endpoint.",
  })
  @UseGuards(IsManagedOrgInManagerOrg)
  @HttpCode(HttpStatus.OK)
  async updateOrganization(
    @Param("orgId", ParseIntPipe) managerOrganizationId: number,
    @Param("managedOrganizationId", ParseIntPipe) managedOrganizationId: number,
    @Body() body: UpdateOrganizationInput
  ): Promise<GetManagedOrganizationOutput> {
    const organization = await this.managedOrganizationsService.updateManagedOrganization(
      managedOrganizationId,
      body
    );
    return {
      status: SUCCESS_STATUS,
      data: organization,
    };
  }

  @Roles("ORG_ADMIN")
  @PlatformPlan(SCALE)
  @Delete("/:managedOrganizationId")
  @Throttle({ limit: 1, ttl: 1000, blockDuration: 1000, name: "organizations_delete" })
  @ApiOperation({
    summary: "Delete an organization within an organization",
    description:
      "Requires the user to have at least the 'ORG_ADMIN' role within the organization. Additionally, for platform, the plan must be 'SCALE' or higher to access this endpoint.",
  })
  @UseGuards(IsManagedOrgInManagerOrg)
  async deleteOrganization(
    @Param("managedOrganizationId", ParseIntPipe) managedOrganizationId: number
  ): Promise<GetManagedOrganizationOutput> {
    const organization =
      await this.managedOrganizationsService.deleteManagedOrganization(managedOrganizationId);
    return {
      status: SUCCESS_STATUS,
      data: organization,
    };
  }
}
