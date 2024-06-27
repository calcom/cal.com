import { SchedulesService_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/services/schedules.service";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { IsUserInOrg } from "@/modules/auth/guards/users/is-user-in-org.guard";
import { OrganizationsSchedulesService } from "@/modules/organizations/services/organizations-schedules.service";
import {
  Controller,
  UseGuards,
  Get,
  Post,
  Param,
  ParseIntPipe,
  Body,
  Patch,
  Delete,
  HttpCode,
  HttpStatus,
  Query,
} from "@nestjs/common";
import { ApiTags as DocsTags } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsNumber, Min, Max, IsOptional } from "class-validator";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import {
  CreateScheduleInput_2024_06_11,
  CreateScheduleOutput_2024_06_11,
  DeleteScheduleOutput_2024_06_11,
  GetScheduleOutput_2024_06_11,
  GetSchedulesOutput_2024_06_11,
  UpdateScheduleInput_2024_06_11,
  UpdateScheduleOutput_2024_06_11,
} from "@calcom/platform-types";

class SkipTakePagination {
  @Transform(({ value }: { value: string }) => value && parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(250)
  @IsOptional()
  take?: number;

  @Transform(({ value }: { value: string }) => value && parseInt(value))
  @IsNumber()
  @Min(0)
  @IsOptional()
  skip?: number;
}

@Controller({
  path: "/v2/organizations/:orgId",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard)
@DocsTags("Organizations Schedules")
export class OrganizationsSchedulesController {
  constructor(
    private schedulesService: SchedulesService_2024_06_11,
    private organizationScheduleService: OrganizationsSchedulesService
  ) {}

  @Roles("ORG_ADMIN")
  @Get("/schedules")
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
  @UseGuards(IsUserInOrg)
  @Post("/users/:userId/schedules")
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
  @UseGuards(IsUserInOrg)
  @Get("/users/:userId/schedules/:scheduleId")
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
  @UseGuards(IsUserInOrg)
  @Get("/users/:userId/schedules")
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
  @UseGuards(IsUserInOrg)
  @Patch("/users/:userId/schedules/:scheduleId")
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
  @UseGuards(IsUserInOrg)
  @Delete("/users/:userId/schedules/:scheduleId")
  @HttpCode(HttpStatus.OK)
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
