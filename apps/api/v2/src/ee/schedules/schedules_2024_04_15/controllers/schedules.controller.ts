import { CreateScheduleOutput_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/outputs/create-schedule.output";
import { DeleteScheduleOutput_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/outputs/delete-schedule.output";
import { GetDefaultScheduleOutput_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/outputs/get-default-schedule.output";
import { GetScheduleOutput_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/outputs/get-schedule.output";
import { GetSchedulesOutput_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/outputs/get-schedules.output";
import { UpdateScheduleOutput_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/outputs/update-schedule.output";
import { SchedulesService_2024_04_15 } from "@/ee/schedules/schedules_2024_04_15/services/schedules.service";
import { VERSION_2024_04_15_VALUE } from "@/lib/api-versions";
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
import { UpdateScheduleInput_2024_04_15 } from "@calcom/platform-types";

import { CreateScheduleInput_2024_04_15 } from "../inputs/create-schedule.input";

@Controller({
  path: "/v2/schedules",
  version: VERSION_2024_04_15_VALUE,
})
@UseGuards(AccessTokenGuard, PermissionsGuard)
@DocsTags("Schedules")
export class SchedulesController_2024_04_15 {
  constructor(private readonly schedulesService: SchedulesService_2024_04_15) {}

  @Post("/")
  @Permissions([SCHEDULE_WRITE])
  async createSchedule(
    @GetUser() user: UserWithProfile,
    @Body() bodySchedule: CreateScheduleInput_2024_04_15
  ): Promise<CreateScheduleOutput_2024_04_15> {
    const schedule = await this.schedulesService.createUserSchedule(user.id, bodySchedule);
    const scheduleFormatted = await this.schedulesService.formatScheduleForAtom(user, schedule);

    return {
      status: SUCCESS_STATUS,
      data: scheduleFormatted,
    };
  }

  @Get("/default")
  @Permissions([SCHEDULE_READ])
  @ApiResponse({
    status: 200,
    description: "Returns the default schedule",
    type: GetDefaultScheduleOutput_2024_04_15,
  })
  async getDefaultSchedule(
    @GetUser() user: UserWithProfile
  ): Promise<GetDefaultScheduleOutput_2024_04_15 | null> {
    const schedule = await this.schedulesService.getUserScheduleDefault(user.id);
    const scheduleFormatted = schedule
      ? await this.schedulesService.formatScheduleForAtom(user, schedule)
      : null;

    return {
      status: SUCCESS_STATUS,
      data: scheduleFormatted,
    };
  }

  @Get("/:scheduleId")
  @Permissions([SCHEDULE_READ])
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // allow 10 requests per minute (for :scheduleId)
  async getSchedule(
    @GetUser() user: UserWithProfile,
    @Param("scheduleId") scheduleId: number
  ): Promise<GetScheduleOutput_2024_04_15> {
    const schedule = await this.schedulesService.getUserSchedule(user.id, scheduleId);
    const scheduleFormatted = await this.schedulesService.formatScheduleForAtom(user, schedule);

    return {
      status: SUCCESS_STATUS,
      data: scheduleFormatted,
    };
  }

  @Get("/")
  @Permissions([SCHEDULE_READ])
  async getSchedules(@GetUser() user: UserWithProfile): Promise<GetSchedulesOutput_2024_04_15> {
    const schedules = await this.schedulesService.getUserSchedules(user.id);
    const schedulesFormatted = await this.schedulesService.formatSchedulesForAtom(user, schedules);

    return {
      status: SUCCESS_STATUS,
      data: schedulesFormatted,
    };
  }

  // note(Lauris): currently this endpoint is atoms only
  @Patch("/:scheduleId")
  @Permissions([SCHEDULE_WRITE])
  async updateSchedule(
    @GetUser() user: UserWithProfile,
    @Body() bodySchedule: UpdateScheduleInput_2024_04_15,
    @Param("scheduleId") scheduleId: string
  ): Promise<UpdateScheduleOutput_2024_04_15> {
    const updatedSchedule = await this.schedulesService.updateUserSchedule(
      user,
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
  ): Promise<DeleteScheduleOutput_2024_04_15> {
    await this.schedulesService.deleteUserSchedule(userId, scheduleId);

    return {
      status: SUCCESS_STATUS,
    };
  }
}
