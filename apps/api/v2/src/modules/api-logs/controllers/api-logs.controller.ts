import { Controller, Get, Query, Param, UseGuards } from "@nestjs/common";
import { ApiLogsService } from "../services/api-logs.service";
import { GetApiLogsInput } from "../inputs/get-api-logs.input";

@Controller("api-logs")
export class ApiLogsController {
  constructor(private readonly apiLogsService: ApiLogsService) {}

  @Get()
  async findAll(@Query() filters: GetApiLogsInput) {
    // TODO: Extract user from request context
    const userId = 1; // Placeholder
    const organizationId = undefined;
    return this.apiLogsService.findAll(filters, userId, organizationId);
  }

  @Get("stats")
  async getStats(@Query("startDate") startDate: string, @Query("endDate") endDate: string) {
    const userId = 1; // Placeholder
    const organizationId = undefined;
    return this.apiLogsService.getStats(new Date(startDate), new Date(endDate), userId, organizationId);
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    const userId = 1; // Placeholder
    const organizationId = undefined;
    return this.apiLogsService.findOne(id, userId, organizationId);
  }
}
