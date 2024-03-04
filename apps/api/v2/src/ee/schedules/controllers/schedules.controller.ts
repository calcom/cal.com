import { ResponseService } from "@/ee/schedules/services/response/response.service";
import { SchedulesService } from "@/ee/schedules/services/schedules.service";
import { ForAtom } from "@/lib/atoms/decorators/for-atom.decorator";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { AccessTokenGuard } from "@/modules/auth/guards/access-token/access-token.guard";
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

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { ScheduleWithAvailabilitiesForWeb } from "@calcom/platform-libraries";
import type { CityTimezones } from "@calcom/platform-libraries";
import { updateScheduleHandler } from "@calcom/platform-libraries";
import type { UpdateScheduleOutputType } from "@calcom/platform-libraries";
import { ScheduleResponse, UpdateScheduleInput } from "@calcom/platform-types";
import { ApiResponse } from "@calcom/platform-types";

import { CreateScheduleInput } from "../inputs/create-schedule.input";

@Controller({
  path: "schedules",
  version: "2",
})
@UseGuards(AccessTokenGuard)
export class SchedulesController {
  constructor(
    private readonly schedulesService: SchedulesService,
    private readonly schedulesResponseService: ResponseService
  ) {}

  @Post("/")
  async createSchedule(
    @GetUser() user: UserWithProfile,
    @Body() bodySchedule: CreateScheduleInput,
    @ForAtom() forAtom: boolean
  ): Promise<ApiResponse<{ schedule: ScheduleResponse | ScheduleWithAvailabilitiesForWeb }>> {
    const schedule = await this.schedulesService.createUserSchedule(user.id, bodySchedule);
    const scheduleFormatted = await this.schedulesResponseService.formatSchedule(forAtom, user, schedule);

    return {
      status: SUCCESS_STATUS,
      data: {
        schedule: scheduleFormatted,
      },
    };
  }

  @Get("/default")
  async getDefaultSchedule(
    @GetUser() user: UserWithProfile,
    @ForAtom() forAtom: boolean
  ): Promise<ApiResponse<ScheduleResponse | ScheduleWithAvailabilitiesForWeb | null>> {
    const schedule = await this.schedulesService.getUserScheduleDefault(user.id);
    const scheduleFormatted = schedule
      ? await this.schedulesResponseService.formatSchedule(forAtom, user, schedule)
      : null;

    return {
      status: SUCCESS_STATUS,
      data: scheduleFormatted,
    };
  }

  @Get("/time-zones")
  async getTimeZones(): Promise<ApiResponse<{ timeZones: CityTimezones }>> {
    const timeZones = await this.schedulesService.getSchedulePossibleTimeZones();

    return {
      status: SUCCESS_STATUS,
      data: {
        timeZones,
      },
    };
  }

  @Get("/:scheduleId")
  async getSchedule(
    @GetUser() user: UserWithProfile,
    @Param("scheduleId") scheduleId: number,
    @ForAtom() forAtom: boolean
  ): Promise<ApiResponse<ScheduleResponse | ScheduleWithAvailabilitiesForWeb>> {
    const schedule = await this.schedulesService.getUserSchedule(user.id, scheduleId);
    const scheduleFormatted = await this.schedulesResponseService.formatSchedule(forAtom, user, schedule);

    return {
      status: SUCCESS_STATUS,
      data: {
        schedule: scheduleFormatted,
      },
    };
  }

  @Get("/")
  async getSchedules(
    @GetUser() user: UserWithProfile,
    @ForAtom() forAtom: boolean
  ): Promise<ApiResponse<{ schedules: ScheduleResponse[] | ScheduleWithAvailabilitiesForWeb[] }>> {
    const schedules = await this.schedulesService.getUserSchedules(user.id);
    const schedulesFormatted = await this.schedulesResponseService.formatSchedules(forAtom, user, schedules);

    return {
      status: SUCCESS_STATUS,
      data: {
        schedules: schedulesFormatted,
      },
    };
  }
  @Patch("/:scheduleId")
  async updateSchedule(
    @GetUser() user: UserWithProfile,
    @Body() bodySchedule: UpdateScheduleInput
  ): Promise<ApiResponse<unknown>> {
    const updatedSchedule: UpdateScheduleOutputType = await updateScheduleHandler({
      input: bodySchedule,
      ctx: { user },
    });

    return {
      status: SUCCESS_STATUS,
      data: updatedSchedule,
    };
  }

  @Delete("/:scheduleId")
  @HttpCode(HttpStatus.OK)
  async deleteSchedule(
    @GetUser("id") userId: number,
    @Param("scheduleId") scheduleId: number
  ): Promise<ApiResponse> {
    await this.schedulesService.deleteUserSchedule(userId, scheduleId);

    return {
      status: SUCCESS_STATUS,
    };
  }
}
