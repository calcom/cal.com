import {
  Controller,
  UseGuards,
  Param,
  ParseIntPipe,
  Post,
  Body,
  Get,
  Patch,
  HttpCode,
  HttpStatus,
  Delete,
} from "@nestjs/common";
import { ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";

import { SUCCESS_STATUS } from "@calcom/platform-constants";

import { API_VERSIONS_VALUES } from "../../../lib/api-versions";
import { PlatformPlan } from "../../auth/decorators/billing/platform-plan.decorator";
import { GetUser } from "../../auth/decorators/get-user/get-user.decorator";
import { Roles } from "../../auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "../../auth/guards/api-auth/api-auth.guard";
import { PlatformPlanGuard } from "../../auth/guards/billing/platform-plan.guard";
import { IsAdminAPIEnabledGuard } from "../../auth/guards/organizations/is-admin-api-enabled.guard";
import { IsManagedOrgInManagerOrg } from "../../auth/guards/organizations/is-managed-org-in-manager-org.guard";
import { IsOrgGuard } from "../../auth/guards/organizations/is-org.guard";
import { RolesGuard } from "../../auth/guards/roles/roles.guard";
import { ApiAuthGuardUser } from "../../auth/strategies/api-auth/api-auth.strategy";
import { CreateOrganizationInput } from "../../organizations/organizations/inputs/create-managed-organization.input";
import { UpdateOrganizationInput } from "../../organizations/organizations/inputs/update-managed-organization.input";
import { CreateManagedOrganizationOutput } from "../../organizations/organizations/outputs/create-managed-organization.output";
import { GetManagedOrganizationOutput } from "../../organizations/organizations/outputs/get-managed-organization.output";
import { GetManagedOrganizationsOutput } from "../../organizations/organizations/outputs/get-managed-organizations.output";
import { ManagedOrganizationsService } from "../../organizations/organizations/services/managed-organizations.service";

const SCALE = "SCALE";

@Controller({
  path: "/v2/organizations/:orgId/organizations",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, PlatformPlanGuard, IsAdminAPIEnabledGuard)
@DocsTags("Orgs / Orgs")
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
    @Param("orgId", ParseIntPipe) managerOrganizationId: number
  ): Promise<GetManagedOrganizationsOutput> {
    const organizations = await this.managedOrganizationsService.getManagedOrganizations(
      managerOrganizationId
    );
    return {
      status: SUCCESS_STATUS,
      data: organizations,
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
  @ApiOperation({
    summary: "Delete an organization within an organization",
    description:
      "Requires the user to have at least the 'ORG_ADMIN' role within the organization. Additionally, for platform, the plan must be 'SCALE' or higher to access this endpoint.",
  })
  @UseGuards(IsManagedOrgInManagerOrg)
  async deleteOrganization(
    @Param("managedOrganizationId", ParseIntPipe) managedOrganizationId: number
  ): Promise<GetManagedOrganizationOutput> {
    const organization = await this.managedOrganizationsService.deleteManagedOrganization(
      managedOrganizationId
    );
    return {
      status: SUCCESS_STATUS,
      data: organization,
    };
  }
}
