import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";
import type { UpdateEventTypeReturn } from "@calcom/platform-libraries/event-types";
import { PublicEventType } from "@calcom/platform-libraries/event-types";
import { ApiResponse } from "@calcom/platform-types";
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
  VERSION_NEUTRAL,
  Version,
} from "@nestjs/common";
import { ApiExcludeController as DocsExcludeController, ApiTags as DocsTags } from "@nestjs/swagger";
import { GetEventTypePublicOutput } from "@/ee/event-types/event-types_2024_04_15/outputs/get-event-type-public.output";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import {
  BulkUpdateEventTypeToDefaultLocationDto,
  EventTypesAppInput,
} from "@/modules/atoms/inputs/event-types-app.input";
import { GetAtomPublicEventTypeQueryParams } from "@/modules/atoms/inputs/get-atom-public-event-type-query-params.input";
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

/*
Event-types endpoints for atoms, split from AtomsController for clarity and maintainability.
These endpoints should not be recommended for use by third party and are excluded from docs.
*/

@Controller({
  path: "/v2/atoms",
  version: API_VERSIONS_VALUES,
})
@DocsTags("Atoms - event-types endpoints for atoms")
@DocsExcludeController(true)
export class AtomsEventTypesController {
  constructor(private readonly eventTypesService: EventTypesAtomService) {}

  @Get("/event-types/:eventSlug/public")
  async getPublicEventType(
    @Param("eventSlug") eventSlug: string,
    @Query() queryParams: GetAtomPublicEventTypeQueryParams
  ): Promise<ApiResponse<PublicEventType>> {
    const { username, teamId, orgId, isTeamEvent } = queryParams;

    const event = await this.eventTypesService.getPublicEventTypeForAtoms({
      username,
      eventSlug,
      isTeamEvent: isTeamEvent ?? false,
      teamId,
      orgId,
    });

    return {
      data: event,
      status: SUCCESS_STATUS,
    };
  }

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
}
