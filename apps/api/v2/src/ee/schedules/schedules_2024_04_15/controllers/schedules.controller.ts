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
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
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
import { ApiExcludeController as DocsExcludeController } from "@nestjs/swagger";

import { SCHEDULE_READ, SCHEDULE_WRITE, SUCCESS_STATUS } from "@calcom/platform-constants";
import { UpdateScheduleInput_2024_04_15 } from "@calcom/platform-types";

import { CreateScheduleInput_2024_04_15 } from "../inputs/create-schedule.input";

@Controller({
  path: "/v2/schedules",
  version: VERSION_2024_04_15_VALUE,
})
@UseGuards(ApiAuthGuard, PermissionsGuard)
@DocsExcludeController(true)
export class SchedulesController_2024_04_15 {
  constructor(private readonly schedulesService: SchedulesService_2024_04_15) {}

  @Post("/")
  @Permissions([SCHEDULE_WRITE])
  async createSchedule(
    @GetUser() user: UserWithProfile,
    @Body() bodySchedule: CreateScheduleInput_2024_04_15
  ): Promise<CreateScheduleOutput_2024_04_15> {
    const schedule = await this.schedulesService.createUserSchedule(user.id, bodySchedule);

    return {
      status: SUCCESS_STATUS,
      data: schedule,
    };
  }

  @Get("/default")
  @Permissions([SCHEDULE_READ])
  async getDefaultSchedule(
    @GetUser() user: UserWithProfile
  ): Promise<GetDefaultScheduleOutput_2024_04_15 | null> {
    const schedule = await this.schedulesService.getUserScheduleDefault(user.id);

    return {
      status: SUCCESS_STATUS,
      data: schedule,
    };
  }

  @Get("/:scheduleId")
  @Permissions([SCHEDULE_READ])
  async getSchedule(
    @GetUser() user: UserWithProfile,
    @Param("scheduleId") scheduleId: number
  ): Promise<GetScheduleOutput_2024_04_15> {
    const schedule = await this.schedulesService.getUserSchedule(user.id, scheduleId);

    return {
      status: SUCCESS_STATUS,
      data: schedule,
    };
  }

  @Get("/")
  @Permissions([SCHEDULE_READ])
  async getSchedules(@GetUser() user: UserWithProfile): Promise<GetSchedulesOutput_2024_04_15> {
    const schedules = await this.schedulesService.getUserSchedules(
      user.id,
      user.timeZone,
      user.defaultScheduleId
    );

    return {
      status: SUCCESS_STATUS,
      data: schedules,
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
