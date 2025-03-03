import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import {
  BulkUpdateEventTypeToDefaultLocationDto,
  EventTypesAppInput,
} from "@/modules/atoms/inputs/event-types-app.input";
import { ConferencingAtomsService } from "@/modules/atoms/services/conferencing-atom.service";
import { EventTypesAtomService } from "@/modules/atoms/services/event-types-atom.service";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { OrganizationsConferencingService } from "@/modules/organizations/conferencing/services/organizations-conferencing.service";
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
import type { UpdateEventTypeReturn } from "@calcom/platform-libraries";
import { ConnectedApps } from "@calcom/platform-libraries";
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
    private readonly conferencingService: ConferencingAtomsService,
    private readonly organizationsConferencingService: OrganizationsConferencingService
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

  @Get("/event-types")
  @Version(VERSION_NEUTRAL)
  @UseGuards(ApiAuthGuard)
  async getAtomEventTypes(
    @GetUser() user: UserWithProfile,
    @Query("teamId") teamId?: string,
    @Query("orgId") orgId?: string
  ): Promise<ApiResponse<unknown>> {
    let validatedOrgId;
    let validatedTeamId;
    if (teamId && orgId) {
      ({ orgId: validatedOrgId, teamId: validatedTeamId } =
        await this.organizationsConferencingService.verifyAccess({
          user,
          orgId,
          teamId,
          requiredRole: "TEAM_ADMIN",
          minimumPlan: "ESSENTIALS",
        }));
    }
    const eventType = await this.eventTypesService.getUserEventTypes(user.id, validatedTeamId);
    return {
      status: SUCCESS_STATUS,
      data: eventType,
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

    const app = await this.eventTypesService.getEventTypesAppIntegration(appSlug, user.id, user.name, teamId);

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

  @Patch("event-types/:eventTypeId")
  @Version(VERSION_NEUTRAL)
  @UseGuards(ApiAuthGuard)
  async updateAtomEventType(
    @GetUser() user: UserWithProfile,
    @Param("eventTypeId", ParseIntPipe) eventTypeId: number,
    @Body() body: UpdateEventTypeReturn
  ): Promise<ApiResponse<UpdateEventTypeReturn>> {
    const eventType = await this.eventTypesService.updateEventType(eventTypeId, body, user);
    return {
      status: SUCCESS_STATUS,
      data: eventType,
    };
  }

  @Patch("/organizations/:organizationId/teams/:teamId/event-types/:eventTypeId")
  @Version(VERSION_NEUTRAL)
  @UseGuards(ApiAuthGuard)
  async updateAtomTeamEventType(
    @GetUser() user: UserWithProfile,
    @Param("eventTypeId", ParseIntPipe) eventTypeId: number,
    @Param("teamId", ParseIntPipe) teamId: number,
    @Body() body: UpdateEventTypeReturn
  ): Promise<ApiResponse<UpdateEventTypeReturn>> {
    const eventType = await this.eventTypesService.updateTeamEventType(eventTypeId, body, user, teamId);
    return {
      status: SUCCESS_STATUS,
      data: eventType,
    };
  }

  @Get("/organizations/:organizationId/teams/:teamId/conferencing")
  @Version(VERSION_NEUTRAL)
  @UseGuards(ApiAuthGuard)
  async listTeamInstalledConferencingApps(
    @GetUser() user: UserWithProfile,
    @Param("organizationId", ParseIntPipe) organizationId: number,
    @Param("teamId", ParseIntPipe) teamId: number
  ): Promise<ApiResponse<ConnectedApps>> {
    // Verify user has access to this organization and team
    await this.organizationsConferencingService.verifyAccess({
      user,
      orgId: organizationId.toString(),
      teamId: teamId.toString(),
      requiredRole: "TEAM_ADMIN",
      minimumPlan: "ESSENTIALS",
    });

    // Get conferencing apps for the team
    const conferencingApps = await this.conferencingService.getConferencingApps(user, teamId, organizationId);

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
    const conferencingApps = await this.conferencingService.getConferencingApps(user, undefined, undefined);
    return {
      status: SUCCESS_STATUS,
      data: conferencingApps,
    };
  }
}
