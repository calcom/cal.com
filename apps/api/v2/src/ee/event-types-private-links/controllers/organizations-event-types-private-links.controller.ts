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
import { IsAdminAPIEnabledGuard } from "@/modules/auth/guards/organizations/is-admin-api-enabled.guard";
import { IsNotPlatformOrgGuard } from "@/modules/auth/guards/organizations/is-not-platform-org.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { IsTeamInOrg } from "@/modules/auth/guards/teams/is-team-in-org.guard";
import { OrganizationContextService } from "@/ee/event-types-private-links/services/organization-context.service";
import { TeamsEventTypesService } from "@/modules/teams/event-types/services/teams-event-types.service";
import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import {
  CreatePrivateLinkInput,
  CreatePrivateLinkOutput,
  DeletePrivateLinkOutput,
  GetPrivateLinksOutput,
  UpdatePrivateLinkInput,
  UpdatePrivateLinkOutput,
} from "@calcom/platform-types";

import { PrivateLinksService } from "../services/private-links.service";

@Controller({
  path: "/v2/organizations/:orgId/teams/:teamId/event-types/:eventTypeId/private-links",
  version: API_VERSIONS_VALUES,
})
@DocsTags("Orgs / Teams / Event Types / Private Links")
@ApiHeader(OPTIONAL_X_CAL_CLIENT_ID_HEADER)
@ApiHeader(OPTIONAL_X_CAL_SECRET_KEY_HEADER)
@ApiHeader(OPTIONAL_API_KEY_HEADER)
export class OrganizationsEventTypesPrivateLinksController {
  constructor(
    private readonly privateLinksService: PrivateLinksService,
    private readonly teamsEventTypesService: TeamsEventTypesService,
    private readonly organizationContextService: OrganizationContextService
  ) {}

  @Post("/")
  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
    @UseGuards(ApiAuthGuard, IsOrgGuard, IsNotPlatformOrgGuard, RolesGuard, IsTeamInOrg, PlatformPlanGuard, IsAdminAPIEnabledGuard)
    @ApiOperation({ summary: "Create a private link for a team event type" })
  async createPrivateLink(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("eventTypeId", ParseIntPipe) eventTypeId: number,
    @Body() body: CreatePrivateLinkInput
  ): Promise<CreatePrivateLinkOutput> {
    await this.teamsEventTypesService.validateEventTypeExists(teamId, eventTypeId);
    
    const { orgSlug, eventTypeSlug } = await this.organizationContextService.getOrganizationEventTypeContext(
      orgId,
      teamId,
      eventTypeId
    );
    
    const privateLink = await this.privateLinksService.createPrivateLink({
      eventTypeId,
      userId: teamId,
      input: body,
      orgSlug,
      eventTypeSlug,
    });
    return {
      status: SUCCESS_STATUS,
      data: privateLink,
    };
  }

  @Get("/")
  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
    @UseGuards(ApiAuthGuard, IsOrgGuard, IsNotPlatformOrgGuard, RolesGuard, IsTeamInOrg, PlatformPlanGuard, IsAdminAPIEnabledGuard)
    @ApiOperation({ summary: "Get all private links for a team event type" })
  async getPrivateLinks(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("eventTypeId", ParseIntPipe) eventTypeId: number
  ): Promise<GetPrivateLinksOutput> {
    await this.teamsEventTypesService.validateEventTypeExists(teamId, eventTypeId);
    
    const { orgSlug, eventTypeSlug } = await this.organizationContextService.getOrganizationEventTypeContext(
      orgId,
      teamId,
      eventTypeId
    );
    
    const privateLinks = await this.privateLinksService.getPrivateLinks({
      eventTypeId,
      orgSlug,
      eventTypeSlug,
    });
    return {
      status: SUCCESS_STATUS,
      data: privateLinks,
    };
  }

  @Patch("/:linkId")
  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
    @UseGuards(ApiAuthGuard, IsOrgGuard, IsNotPlatformOrgGuard, RolesGuard, IsTeamInOrg, PlatformPlanGuard, IsAdminAPIEnabledGuard)
    @ApiOperation({ summary: "Update a private link for a team event type" })
  async updatePrivateLink(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("eventTypeId", ParseIntPipe) eventTypeId: number,
    @Param("linkId") linkId: string,
    @Body() body: Omit<UpdatePrivateLinkInput, "linkId">
  ): Promise<UpdatePrivateLinkOutput> {
    await this.teamsEventTypesService.validateEventTypeExists(teamId, eventTypeId);
    
    const { orgSlug, eventTypeSlug } = await this.organizationContextService.getOrganizationEventTypeContext(
      orgId,
      teamId,
      eventTypeId
    );
    
    const updateInput: UpdatePrivateLinkInput = { ...body, linkId };
    const privateLink = await this.privateLinksService.updatePrivateLink({
      eventTypeId,
      input: updateInput,
      orgSlug,
      eventTypeSlug,
    });
    return {
      status: SUCCESS_STATUS,
      data: privateLink,
    };
  }

  @Delete("/:linkId")
  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
    @UseGuards(ApiAuthGuard, IsOrgGuard, IsNotPlatformOrgGuard, RolesGuard, IsTeamInOrg, PlatformPlanGuard, IsAdminAPIEnabledGuard)
    @ApiOperation({ summary: "Delete a private link for a team event type" })
  async deletePrivateLink(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("eventTypeId", ParseIntPipe) eventTypeId: number,
    @Param("linkId") linkId: string
  ): Promise<DeletePrivateLinkOutput> {
    await this.teamsEventTypesService.validateEventTypeExists(teamId, eventTypeId);
    await this.privateLinksService.deletePrivateLink(eventTypeId, linkId);
    return {
      status: SUCCESS_STATUS,
      data: {
        linkId,
        message: "Private link deleted successfully",
      },
    };
  }
}
