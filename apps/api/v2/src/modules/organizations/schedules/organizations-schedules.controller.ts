import { SUCCESS_STATUS } from "@calcom/platform-constants";
import {
  CreateScheduleInput_2024_06_11,
  CreateScheduleOutput_2024_06_11,
  DeleteScheduleOutput_2024_06_11,
  GetScheduleOutput_2024_06_11,
  GetSchedulesOutput_2024_06_11,
  SkipTakePagination,
  UpdateScheduleInput_2024_06_11,
  UpdateScheduleOutput_2024_06_11,
} from "@calcom/platform-types";
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
import { SchedulesService_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/services/schedules.service";
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
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { IsUserInOrg } from "@/modules/auth/guards/users/is-user-in-org.guard";
import { OrganizationsSchedulesService } from "@/modules/organizations/schedules/services/organizations-schedules.service";

@Controller({
  path: "/v2/organizations/:orgId",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, PlatformPlanGuard, IsAdminAPIEnabledGuard)
@ApiHeader(OPTIONAL_X_CAL_CLIENT_ID_HEADER)
@ApiHeader(OPTIONAL_X_CAL_SECRET_KEY_HEADER)
@ApiHeader(OPTIONAL_API_KEY_HEADER)
export class OrganizationsSchedulesController {
  constructor(
    private schedulesService: SchedulesService_2024_06_11,
    private organizationScheduleService: OrganizationsSchedulesService
  ) {}

  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @Get("/schedules")
  @DocsTags("Orgs / Schedules")
  @ApiOperation({ summary: "Get all schedules" })
  async getOrganizationSchedules(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Query() queryParams: SkipTakePagination
  ): Promise<GetSchedulesOutput_2024_06_11> {
    const { skip, take } = queryParams;

    const schedules = await this.organizationScheduleService.getOrganizationSchedules(orgId, skip, take);

    return {
      status: SUCCESS_STATUS,
      data: schedules,
    };
  }

  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(IsUserInOrg)
  @Post("/users/:userId/schedules")
  @DocsTags("Orgs / Users / Schedules")
  @ApiOperation({ summary: "Create a schedule" })
  async createUserSchedule(
    @Param("userId", ParseIntPipe) userId: number,
    @Body() bodySchedule: CreateScheduleInput_2024_06_11
  ): Promise<CreateScheduleOutput_2024_06_11> {
    const schedule = await this.schedulesService.createUserSchedule(userId, bodySchedule);

    return {
      status: SUCCESS_STATUS,
      data: schedule,
    };
  }

  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(IsUserInOrg)
  @Get("/users/:userId/schedules/:scheduleId")
  @DocsTags("Orgs / Users / Schedules")
  @ApiOperation({ summary: "Get a schedule" })
  async getUserSchedule(
    @Param("userId", ParseIntPipe) userId: number,
    @Param("scheduleId") scheduleId: number
  ): Promise<GetScheduleOutput_2024_06_11> {
    const schedule = await this.schedulesService.getUserSchedule(userId, scheduleId);

    return {
      status: SUCCESS_STATUS,
      data: schedule,
    };
  }

  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(IsUserInOrg)
  @Get("/users/:userId/schedules")
  @DocsTags("Orgs / Users / Schedules")
  @ApiOperation({ summary: "Get all schedules" })
  async getUserSchedules(
    @Param("userId", ParseIntPipe) userId: number
  ): Promise<GetSchedulesOutput_2024_06_11> {
    const schedules = await this.schedulesService.getUserSchedules(userId);

    return {
      status: SUCCESS_STATUS,
      data: schedules,
    };
  }

  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(IsUserInOrg)
  @Patch("/users/:userId/schedules/:scheduleId")
  @DocsTags("Orgs / Users / Schedules")
  @ApiOperation({ summary: "Update a schedule" })
  async updateUserSchedule(
    @Param("userId", ParseIntPipe) userId: number,
    @Param("scheduleId", ParseIntPipe) scheduleId: number,
    @Body() bodySchedule: UpdateScheduleInput_2024_06_11
  ): Promise<UpdateScheduleOutput_2024_06_11> {
    const updatedSchedule = await this.schedulesService.updateUserSchedule(userId, scheduleId, bodySchedule);

    return {
      status: SUCCESS_STATUS,
      data: updatedSchedule,
    };
  }

  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(IsUserInOrg)
  @Delete("/users/:userId/schedules/:scheduleId")
  @HttpCode(HttpStatus.OK)
  @DocsTags("Orgs / Users / Schedules")
  @ApiOperation({ summary: "Delete a schedule" })
  async deleteUserSchedule(
    @Param("userId", ParseIntPipe) userId: number,
    @Param("scheduleId", ParseIntPipe) scheduleId: number
  ): Promise<DeleteScheduleOutput_2024_06_11> {
    await this.schedulesService.deleteUserSchedule(userId, scheduleId);

    return {
      status: SUCCESS_STATUS,
    };
  }
}
