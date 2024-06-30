import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { GetMembership } from "@/modules/auth/decorators/get-membership/get-membership.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { IsMembershipInOrg } from "@/modules/auth/guards/memberships/is-membership-in-org.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { CreateOrgMembershipDto } from "@/modules/organizations/inputs/create-organization-membership.input";
import { OrgMembershipOutputDto } from "@/modules/organizations/outputs/organization-membership.output";
import { OrganizationsMembershipService } from "@/modules/organizations/services/organizations-membership.service";
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
} from "@nestjs/common";
import { ApiTags as DocsTags } from "@nestjs/swagger";
import { plainToClass } from "class-transformer";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiResponse, SkipTakePagination } from "@calcom/platform-types";
import { Membership } from "@calcom/prisma/client";

@Controller({
  path: "/v2/organizations/:orgId/memberships",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard)
@DocsTags("Organizations Memberships")
export class OrganizationsMembershipsController {
  constructor(private organizationsMembershipService: OrganizationsMembershipService) {}

  @Get()
  @UseGuards()
  @Roles("ORG_ADMIN")
  async getAllMemberships(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Query() queryParams: SkipTakePagination
  ): Promise<ApiResponse<OrgMembershipOutputDto[]>> {
    const { skip, take } = queryParams;
    const memberships = await this.organizationsMembershipService.getPaginatedOrgMemberships(
      orgId,
      skip ?? 0,
      take ?? 250
    );
    return {
      status: SUCCESS_STATUS,
      data: memberships.map((membership) =>
        plainToClass(OrgMembershipOutputDto, membership, { strategy: "excludeAll" })
      ),
    };
  }

  @Post()
  @UseGuards()
  @Roles("ORG_ADMIN")
  async createMembership(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Body() body: CreateOrgMembershipDto
  ): Promise<ApiResponse<OrgMembershipOutputDto>> {
    const membership = await this.organizationsMembershipService.createOrgMembership(orgId, body);
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(OrgMembershipOutputDto, membership, { strategy: "excludeAll" }),
    };
  }

  @Get()
  @UseGuards(IsMembershipInOrg)
  @Roles("ORG_ADMIN")
  @Get("/:membershipId")
  async getMembership(@GetMembership() membership: Membership): Promise<ApiResponse<OrgMembershipOutputDto>> {
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(OrgMembershipOutputDto, membership, { strategy: "excludeAll" }),
    };
  }

  @UseGuards(IsMembershipInOrg)
  @Roles("ORG_ADMIN")
  @Delete("/:membershipId")
  async deleteMembership(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("membershipId", ParseIntPipe) membershipId: number
  ): Promise<ApiResponse<OrgMembershipOutputDto>> {
    const membership = await this.organizationsMembershipService.deleteOrgMembership(orgId, membershipId);
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(OrgMembershipOutputDto, membership, { strategy: "excludeAll" }),
    };
  }

  @UseGuards(IsMembershipInOrg)
  @Roles("ORG_ADMIN")
  @Patch("/:membershipId")
  async updateMembership(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("membershipId", ParseIntPipe) membershipId: number,
    @Body() body: CreateOrgMembershipDto
  ): Promise<ApiResponse<OrgMembershipOutputDto>> {
    const membership = await this.organizationsMembershipService.updateOrgMembership(
      orgId,
      membershipId,
      body
    );
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(OrgMembershipOutputDto, membership, { strategy: "excludeAll" }),
    };
  }
}
