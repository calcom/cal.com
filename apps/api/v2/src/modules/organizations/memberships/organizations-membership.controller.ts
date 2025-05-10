import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import {
  OPTIONAL_API_KEY_HEADER,
  OPTIONAL_X_CAL_CLIENT_ID_HEADER,
  OPTIONAL_X_CAL_SECRET_KEY_HEADER,
} from "@/lib/docs/headers";
import { PlatformPlan } from "@/modules/auth/decorators/billing/platform-plan.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PlatformPlanGuard } from "@/modules/auth/guards/billing/platform-plan.guard";
import { IsMembershipInOrg } from "@/modules/auth/guards/memberships/is-membership-in-org.guard";
import { IsAdminAPIEnabledGuard } from "@/modules/auth/guards/organizations/is-admin-api-enabled.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { CreateOrgMembershipDto } from "@/modules/organizations/memberships/inputs/create-organization-membership.input";
import { UpdateOrgMembershipDto } from "@/modules/organizations/memberships/inputs/update-organization-membership.input";
import { CreateOrgMembershipOutput } from "@/modules/organizations/memberships/outputs/create-membership.output";
import { DeleteOrgMembership } from "@/modules/organizations/memberships/outputs/delete-membership.output";
import { GetAllOrgMemberships } from "@/modules/organizations/memberships/outputs/get-all-memberships.output";
import { GetOrgMembership } from "@/modules/organizations/memberships/outputs/get-membership.output";
import { UpdateOrgMembership } from "@/modules/organizations/memberships/outputs/update-membership.output";
import { OrganizationsMembershipService } from "@/modules/organizations/memberships/services/organizations-membership.service";
import {
  Controller,
  UseGuards,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Delete,
  Patch,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { SkipTakePagination } from "@calcom/platform-types";

@Controller({
  path: "/v2/organizations/:orgId/memberships",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, PlatformPlanGuard, IsAdminAPIEnabledGuard)
@DocsTags("Orgs / Memberships")
@ApiHeader(OPTIONAL_X_CAL_CLIENT_ID_HEADER)
@ApiHeader(OPTIONAL_X_CAL_SECRET_KEY_HEADER)
@ApiHeader(OPTIONAL_API_KEY_HEADER)
export class OrganizationsMembershipsController {
  constructor(private organizationsMembershipService: OrganizationsMembershipService) {}

  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @Get("/")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get all memberships" })
  async getAllMemberships(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Query() queryParams: SkipTakePagination
  ): Promise<GetAllOrgMemberships> {
    const { skip, take } = queryParams;
    const memberships = await this.organizationsMembershipService.getPaginatedOrgMemberships(
      orgId,
      skip ?? 0,
      take ?? 250
    );
    return {
      status: SUCCESS_STATUS,
      data: memberships,
    };
  }

  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @Post("/")
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Create a membership" })
  async createMembership(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Body() body: CreateOrgMembershipDto
  ): Promise<CreateOrgMembershipOutput> {
    const membership = await this.organizationsMembershipService.createOrgMembership(orgId, body);
    return {
      status: SUCCESS_STATUS,
      data: membership,
    };
  }

  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(IsMembershipInOrg)
  @Get("/:membershipId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get a membership" })
  async getOrgMembership(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("membershipId", ParseIntPipe) membershipId: number
  ): Promise<GetOrgMembership> {
    const membership = await this.organizationsMembershipService.getOrgMembership(orgId, membershipId);
    return {
      status: SUCCESS_STATUS,
      data: membership,
    };
  }

  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(IsMembershipInOrg)
  @Delete("/:membershipId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete a membership" })
  async deleteMembership(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("membershipId", ParseIntPipe) membershipId: number
  ): Promise<DeleteOrgMembership> {
    const membership = await this.organizationsMembershipService.deleteOrgMembership(orgId, membershipId);
    return {
      status: SUCCESS_STATUS,
      data: membership,
    };
  }

  @UseGuards(IsMembershipInOrg)
  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @Patch("/:membershipId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update a membership" })
  async updateMembership(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("membershipId", ParseIntPipe) membershipId: number,
    @Body() body: UpdateOrgMembershipDto
  ): Promise<UpdateOrgMembership> {
    const membership = await this.organizationsMembershipService.updateOrgMembership(
      orgId,
      membershipId,
      body
    );
    return {
      status: SUCCESS_STATUS,
      data: membership,
    };
  }
}
