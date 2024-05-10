import { SchedulesService } from "@/ee/schedules/services/schedules.service";
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
  CreateScheduleOutput,
  CreateScheduleInput,
  UpdateScheduleInput,
  GetScheduleOutput,
  UpdateScheduleOutput,
  GetDefaultScheduleOutput,
  DeleteScheduleOutput,
  GetSchedulesOutput,
} from "@calcom/platform-types";

@Controller({
  path: "schedules",
  version: "2",
})
@UseGuards(AccessTokenGuard, PermissionsGuard)
@DocsTags("Schedules")
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Post("/")
  @Permissions([SCHEDULE_WRITE])
  async createSchedule(
    @GetUser() user: UserWithProfile,
    @Body() bodySchedule: CreateScheduleInput
  ): Promise<CreateScheduleOutput> {
    const schedule = await this.schedulesService.createUserSchedule(user.id, bodySchedule);

    return {
      status: SUCCESS_STATUS,
      data: schedule,
    };
  }

  @Get("/default")
  @Permissions([SCHEDULE_READ])
  @ApiResponse({ status: 200, description: "Returns the default schedule", type: GetDefaultScheduleOutput })
  async getDefaultSchedule(@GetUser() user: UserWithProfile): Promise<GetScheduleOutput> {
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
  ): Promise<GetScheduleOutput> {
    const schedule = await this.schedulesService.getUserSchedule(user.id, scheduleId);

    return {
      status: SUCCESS_STATUS,
      data: schedule,
    };
  }

  @Get("/")
  @Permissions([SCHEDULE_READ])
  async getSchedules(@GetUser() user: UserWithProfile): Promise<GetSchedulesOutput> {
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
    @Body() bodySchedule: UpdateScheduleInput,
    @Param("scheduleId") scheduleId: string
  ): Promise<UpdateScheduleOutput> {
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
  ): Promise<DeleteScheduleOutput> {
    await this.schedulesService.deleteUserSchedule(userId, scheduleId);

    return {
      status: SUCCESS_STATUS,
    };
  }
}
