import { SchedulesService } from "@/ee/schedules/services/schedules.service";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { AccessTokenGuard } from "@/modules/auth/guards/access-token/access-token.guard";
import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiResponse } from "@calcom/platform-types";

import { CreateScheduleInput } from "../inputs/create-schedule.input";

@Controller({
  path: "schedules",
  version: "2",
})
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Post("/")
  @UseGuards(AccessTokenGuard)
  async createSchedule(
    @GetUser("id") userId: number,
    @Body() bodySchedule: CreateScheduleInput
  ): Promise<ApiResponse> {
    const schedule = await this.schedulesService.createSchedule(userId, bodySchedule);

    return {
      status: SUCCESS_STATUS,
      data: schedule,
    };
  }

  @Get("/default")
  @UseGuards(AccessTokenGuard)
  async getDefaultSchedule(@GetUser("id") userId: number): Promise<ApiResponse> {
    const schedule = await this.schedulesService.getDefaultSchedule(userId);

    return {
      status: SUCCESS_STATUS,
      data: schedule,
    };
  }
}
