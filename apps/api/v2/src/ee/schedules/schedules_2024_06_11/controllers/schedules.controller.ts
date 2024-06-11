import { SchedulesService_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/services/schedules.service";
import { VERSION_2024_06_11_VALUE } from "@/lib/api-versions";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Permissions } from "@/modules/auth/decorators/permissions/permissions.decorator";
import { AccessTokenGuard } from "@/modules/auth/guards/access-token/access-token.guard";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { UserWithProfile } from "@/modules/users/users.repository";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Patch,
  UseGuards,
} from "@nestjs/common";
import { ApiResponse, ApiTags as DocsTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { SCHEDULE_READ, SCHEDULE_WRITE, SUCCESS_STATUS } from "@calcom/platform-constants";
import {
  CreateScheduleOutput_2024_06_11,
  CreateScheduleInput_2024_06_11,
  UpdateScheduleInput_2024_06_11,
  GetScheduleOutput_2024_06_11,
  UpdateScheduleOutput_2024_06_11,
  GetDefaultScheduleOutput_2024_06_11,
  DeleteScheduleOutput_2024_06_11,
  GetSchedulesOutput_2024_06_11,
} from "@calcom/platform-types";

@Controller({
  path: "/v2/schedules",
  version: VERSION_2024_06_11_VALUE,
})
@UseGuards(AccessTokenGuard, PermissionsGuard)
@DocsTags("Schedules")
export class SchedulesController_2024_06_11 {
  constructor(private readonly schedulesService: SchedulesService_2024_06_11) {}

  @Post("/")
  @Permissions([SCHEDULE_WRITE])
  async createSchedule(
    @GetUser() user: UserWithProfile,
    @Body() bodySchedule: CreateScheduleInput_2024_06_11
  ): Promise<CreateScheduleOutput_2024_06_11> {
    const schedule = await this.schedulesService.createUserSchedule(user.id, bodySchedule);

    return {
      status: SUCCESS_STATUS,
      data: schedule,
    };
  }

  @Get("/default")
  @Permissions([SCHEDULE_READ])
  @ApiResponse({
    status: 200,
    description: "Returns the default schedule",
    type: GetDefaultScheduleOutput_2024_06_11,
  })
  async getDefaultSchedule(@GetUser() user: UserWithProfile): Promise<GetScheduleOutput_2024_06_11> {
    const schedule = await this.schedulesService.getUserScheduleDefault(user.id);

    return {
      status: SUCCESS_STATUS,
      data: schedule,
    };
  }

  @Get("/:scheduleId")
  @Permissions([SCHEDULE_READ])
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // allow 10 requests per minute (for :scheduleId)
  async getSchedule(
    @GetUser() user: UserWithProfile,
    @Param("scheduleId") scheduleId: number
  ): Promise<GetScheduleOutput_2024_06_11> {
    const schedule = await this.schedulesService.getUserSchedule(user.id, scheduleId);

    return {
      status: SUCCESS_STATUS,
      data: schedule,
    };
  }

  @Get("/")
  @Permissions([SCHEDULE_READ])
  async getSchedules(@GetUser() user: UserWithProfile): Promise<GetSchedulesOutput_2024_06_11> {
    const schedules = await this.schedulesService.getUserSchedules(user.id);

    return {
      status: SUCCESS_STATUS,
      data: schedules,
    };
  }

  @Patch("/:scheduleId")
  @Permissions([SCHEDULE_WRITE])
  async updateSchedule(
    @GetUser() user: UserWithProfile,
    @Body() bodySchedule: UpdateScheduleInput_2024_06_11,
    @Param("scheduleId") scheduleId: string
  ): Promise<UpdateScheduleOutput_2024_06_11> {
    const updatedSchedule = await this.schedulesService.updateUserSchedule(
      user.id,
      Number(scheduleId),
      bodySchedule
    );

    return {
      status: SUCCESS_STATUS,
      data: updatedSchedule,
    };
  }

  @Delete("/:scheduleId")
  @HttpCode(HttpStatus.OK)
  @Permissions([SCHEDULE_WRITE])
  async deleteSchedule(
    @GetUser("id") userId: number,
    @Param("scheduleId") scheduleId: number
  ): Promise<DeleteScheduleOutput_2024_06_11> {
    await this.schedulesService.deleteUserSchedule(userId, scheduleId);

    return {
      status: SUCCESS_STATUS,
    };
  }
}
