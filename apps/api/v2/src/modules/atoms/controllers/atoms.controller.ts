import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import {
  BulkUpdateEventTypeToDefaultLocationDto,
  EventTypesAppInput,
} from "@/modules/atoms/inputs/event-types-app.input";
import { ConferencingAtomsService } from "@/modules/atoms/services/conferencing-atom.service";
import { EventTypesAtomService } from "@/modules/atoms/services/event-types-atom.service";
import { PlatformPlan } from "@/modules/auth/decorators/billing/platform-plan.decorator";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PlatformPlanGuard } from "@/modules/auth/guards/billing/platform-plan.guard";
import { IsAdminAPIEnabledGuard } from "@/modules/auth/guards/organizations/is-admin-api-enabled.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { IsTeamInOrg } from "@/modules/auth/guards/teams/is-team-in-org.guard";
import { UserWithProfile } from "@/modules/users/users.repository";
import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
  Version,
  VERSION_NEUTRAL,
  Patch,
  Body,
  Query,
} from "@nestjs/common";
import { ApiTags as DocsTags, ApiExcludeController as DocsExcludeController } from "@nestjs/swagger";

import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";
import { ConnectedApps } from "@calcom/platform-libraries/app-store";
import type { UpdateEventTypeReturn } from "@calcom/platform-libraries/event-types";
import { ApiResponse } from "@calcom/platform-types";

/*

Endpoints used only by platform atoms, reusing code from other modules, data is already formatted and ready to be used by frontend atoms
these endpoints should not be recommended for use by third party and are excluded from docs

*/

@Controller({
  path: "/v2/atoms",
  version: API_VERSIONS_VALUES,
})
@DocsTags("Atoms - endpoints for atoms")
@DocsExcludeController(true)
export class AtomsController {
  constructor(
    private readonly eventTypesService: EventTypesAtomService,
    private readonly conferencingService: ConferencingAtomsService
  ) {}

  @Get("event-types/:eventTypeId")
  @Version(VERSION_NEUTRAL)
  @UseGuards(ApiAuthGuard)
  async getAtomEventType(
    @GetUser() user: UserWithProfile,
    @Param("eventTypeId", ParseIntPipe) eventTypeId: number
  ): Promise<ApiResponse<unknown>> {
    const eventType = await this.eventTypesService.getUserEventType(user, eventTypeId);
    return {
      status: SUCCESS_STATUS,
      data: eventType,
    };
  }

  @Get("/organizations/:orgId/teams/:teamId/event-types")
  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, IsTeamInOrg, PlatformPlanGuard, IsAdminAPIEnabledGuard)
  @Version(VERSION_NEUTRAL)
  async listTeamEventTypes(@Param("teamId", ParseIntPipe) teamId: number): Promise<ApiResponse<unknown>> {
    const eventTypes = await this.eventTypesService.getTeamEventTypes(teamId);
    return {
      status: SUCCESS_STATUS,
      data: eventTypes,
    };
  }

  @Get("/event-types")
  @Version(VERSION_NEUTRAL)
  @UseGuards(ApiAuthGuard)
  async listUserEventTypes(@GetUser("id") userId: number): Promise<ApiResponse<unknown>> {
    const eventTypes = await this.eventTypesService.getUserEventTypes(userId);
    return {
      status: SUCCESS_STATUS,
      data: eventTypes,
    };
  }

  @Get("event-types-app/:appSlug")
  @Version(VERSION_NEUTRAL)
  @UseGuards(ApiAuthGuard)
  async getAtomEventTypeApp(
    @GetUser() user: UserWithProfile,
    @Param("appSlug") appSlug: string,
    @Query() queryParams: EventTypesAppInput
  ): Promise<ApiResponse<unknown>> {
    const { teamId } = queryParams;

    const app = await this.eventTypesService.getEventTypesAppIntegration(appSlug, user, teamId);

    return {
      status: SUCCESS_STATUS,
      data: {
        app,
      },
    };
  }

  @Get("payment/:uid")
  @Version(VERSION_NEUTRAL)
  @UseGuards(ApiAuthGuard)
  async getUserPaymentInfoById(@Param("uid") uid: string): Promise<ApiResponse<unknown>> {
    const data = await this.eventTypesService.getUserPaymentInfo(uid);

    return {
      status: SUCCESS_STATUS,
      data,
    };
  }

  @Patch("/event-types/bulk-update-to-default-location")
  @Version(VERSION_NEUTRAL)
  @UseGuards(ApiAuthGuard)
  async bulkUpdateAtomEventTypes(
    @GetUser() user: UserWithProfile,
    @Body() body: BulkUpdateEventTypeToDefaultLocationDto
  ): Promise<{ status: typeof SUCCESS_STATUS | typeof ERROR_STATUS }> {
    await this.eventTypesService.bulkUpdateEventTypesDefaultLocation(user, body.eventTypeIds);
    return {
      status: SUCCESS_STATUS,
    };
  }

  @Patch("/organizations/:orgId/teams/:teamId/event-types/bulk-update-to-default-location")
  @Version(VERSION_NEUTRAL)
  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, IsTeamInOrg, PlatformPlanGuard, IsAdminAPIEnabledGuard)
  async bulkUpdateAtomTeamEventTypes(
    @GetUser() user: UserWithProfile,
    @Body() body: BulkUpdateEventTypeToDefaultLocationDto,
    @Param("teamId", ParseIntPipe) teamId: number
  ): Promise<{ status: typeof SUCCESS_STATUS | typeof ERROR_STATUS }> {
    await this.eventTypesService.bulkUpdateTeamEventTypesDefaultLocation(body.eventTypeIds, teamId);
    return {
      status: SUCCESS_STATUS,
    };
  }

  @Patch("event-types/:eventTypeId")
  @Version(VERSION_NEUTRAL)
  @UseGuards(ApiAuthGuard)
  async updateAtomEventType(
    @GetUser() user: UserWithProfile,
    @Param("eventTypeId", ParseIntPipe) eventTypeId: number,
    @Body() body: UpdateEventTypeReturn
  ): Promise<ApiResponse<UpdateEventTypeReturn>> {
    const eventType = await this.eventTypesService.updateEventType(
      eventTypeId,
      { ...body, id: eventTypeId },
      user
    );
    return {
      status: SUCCESS_STATUS,
      data: eventType,
    };
  }

  @Patch("/organizations/:orgId/teams/:teamId/event-types/:eventTypeId")
  @Version(VERSION_NEUTRAL)
  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, IsTeamInOrg, PlatformPlanGuard, IsAdminAPIEnabledGuard)
  async updateAtomTeamEventType(
    @GetUser() user: UserWithProfile,
    @Param("eventTypeId", ParseIntPipe) eventTypeId: number,
    @Param("teamId", ParseIntPipe) teamId: number,
    @Body() body: UpdateEventTypeReturn
  ): Promise<ApiResponse<UpdateEventTypeReturn>> {
    const eventType = await this.eventTypesService.updateTeamEventType(
      eventTypeId,
      { ...body, id: eventTypeId },
      user,
      teamId
    );
    return {
      status: SUCCESS_STATUS,
      data: eventType,
    };
  }
  @Get("/organizations/:orgId/teams/:teamId/conferencing")
  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, IsTeamInOrg, PlatformPlanGuard, IsAdminAPIEnabledGuard)
  @Version(VERSION_NEUTRAL)
  async listTeamInstalledConferencingApps(
    @GetUser() user: UserWithProfile,
    @Param("teamId", ParseIntPipe) teamId: number
  ): Promise<ApiResponse<ConnectedApps>> {
    const conferencingApps = await this.conferencingService.getTeamConferencingApps(user, teamId);

    return {
      status: SUCCESS_STATUS,
      data: conferencingApps,
    };
  }

  @Get("/conferencing")
  @Version(VERSION_NEUTRAL)
  @UseGuards(ApiAuthGuard)
  async listUserInstalledConferencingApps(
    @GetUser() user: UserWithProfile
  ): Promise<ApiResponse<ConnectedApps>> {
    const conferencingApps = await this.conferencingService.getUserConferencingApps(user);
    return {
      status: SUCCESS_STATUS,
      data: conferencingApps,
    };
  }
}
