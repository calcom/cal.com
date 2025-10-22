import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";

import { CalendarsService } from "../services/calendars.service";
import { CreateCalendarDto } from "../dto/create-calendar.dto";
import { UpdateCalendarDto } from "../dto/update-calendar.dto";
import { CalendarResponseDto } from "../dto/calendar-response.dto";
import { GetCalendarsQueryDto } from "../dto/get-calendars-query.dto";
import { OAuthGuard } from "@/modules/auth/guards/oauth.guard";
import { GetUser } from "@/modules/auth/decorators/get-user.decorator";

/**
 * Calendars Controller
 * 
 * Handles all calendar-related HTTP requests following RESTful conventions.
 * Implements CRUD operations for calendar management with OAuth authentication.
 * 
 * Base path: /v1/calendar/calendars
 */
@ApiTags("Calendars")
@Controller("v1/calendar/calendars")
@UseGuards(OAuthGuard)
@ApiBearerAuth()
export class CalendarsController {
  constructor(private readonly calendarsService: CalendarsService) {}

  /**
   * Get all calendars for the authenticated user
   * 
   * Supports filtering by:
   * - Calendar type (primary, secondary, etc.)
   * - Integration source (google, outlook, etc.)
   * - Active status
   * 
   * Includes pagination support
   */
  @Get()
  @ApiOperation({
    summary: "Get all calendars",
    description: "Retrieve all calendars for the authenticated user with optional filtering",
  })
  @ApiResponse({
    status: 200,
    description: "Calendars retrieved successfully",
    type: [CalendarResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Invalid or missing access token",
  })
  @ApiQuery({ name: "type", required: false, description: "Filter by calendar type" })
  @ApiQuery({ name: "integration", required: false, description: "Filter by integration source" })
  @ApiQuery({ name: "isActive", required: false, type: Boolean, description: "Filter by active status" })
  @ApiQuery({ name: "limit", required: false, type: Number, description: "Number of results to return" })
  @ApiQuery({ name: "offset", required: false, type: Number, description: "Number of results to skip" })
  async getCalendars(
    @GetUser("id") userId: number,
    @Query() query: GetCalendarsQueryDto
  ): Promise<CalendarResponseDto[]> {
    return this.calendarsService.getCalendars(userId, query);
  }

  /**
   * Get a specific calendar by ID
   * 
   * Returns detailed information about a single calendar including:
   * - Calendar metadata
   * - Integration settings
   * - Sync status
   * - Associated event types
   */
  @Get(":id")
  @ApiOperation({
    summary: "Get calendar by ID",
    description: "Retrieve detailed information about a specific calendar",
  })
  @ApiParam({
    name: "id",
    type: Number,
    description: "Calendar ID",
  })
  @ApiResponse({
    status: 200,
    description: "Calendar retrieved successfully",
    type: CalendarResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Calendar not found",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Invalid or missing access token",
  })
  async getCalendarById(
    @GetUser("id") userId: number,
    @Param("id", ParseIntPipe) calendarId: number
  ): Promise<CalendarResponseDto> {
    return this.calendarsService.getCalendarById(userId, calendarId);
  }

  /**
   * Create a new calendar
   * 
   * Creates a new calendar for the authenticated user.
   * Can be used to:
   * - Add external calendar integrations
   * - Create custom calendars
   * - Set up destination calendars for event types
   */
  @Post()
  @ApiOperation({
    summary: "Create a new calendar",
    description: "Create a new calendar or add an external calendar integration",
  })
  @ApiResponse({
    status: 201,
    description: "Calendar created successfully",
    type: CalendarResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - Invalid calendar data",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Invalid or missing access token",
  })
  @ApiResponse({
    status: 409,
    description: "Conflict - Calendar already exists",
  })
  @HttpCode(HttpStatus.CREATED)
  async createCalendar(
    @GetUser("id") userId: number,
    @Body() createCalendarDto: CreateCalendarDto
  ): Promise<CalendarResponseDto> {
    return this.calendarsService.createCalendar(userId, createCalendarDto);
  }

  /**
   * Update an existing calendar
   * 
   * Allows partial updates to calendar properties including:
   * - Display name
   * - Color
   * - Active status
   * - Default settings
   * - Integration credentials (if applicable)
   */
  @Patch(":id")
  @ApiOperation({
    summary: "Update a calendar",
    description: "Update properties of an existing calendar",
  })
  @ApiParam({
    name: "id",
    type: Number,
    description: "Calendar ID",
  })
  @ApiResponse({
    status: 200,
    description: "Calendar updated successfully",
    type: CalendarResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Bad request - Invalid update data",
  })
  @ApiResponse({
    status: 404,
    description: "Calendar not found",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Invalid or missing access token",
  })
  async updateCalendar(
    @GetUser("id") userId: number,
    @Param("id", ParseIntPipe) calendarId: number,
    @Body() updateCalendarDto: UpdateCalendarDto
  ): Promise<CalendarResponseDto> {
    return this.calendarsService.updateCalendar(userId, calendarId, updateCalendarDto);
  }

  /**
   * Delete a calendar
   * 
   * Removes a calendar from the user's account.
   * Note: This does not delete the calendar from external services,
   * only removes the integration/connection.
   * 
   * Associated events may be handled based on cascade settings.
   */
  @Delete(":id")
  @ApiOperation({
    summary: "Delete a calendar",
    description: "Remove a calendar from the user's account",
  })
  @ApiParam({
    name: "id",
    type: Number,
    description: "Calendar ID",
  })
  @ApiResponse({
    status: 204,
    description: "Calendar deleted successfully",
  })
  @ApiResponse({
    status: 404,
    description: "Calendar not found",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Invalid or missing access token",
  })
  @ApiResponse({
    status: 409,
    description: "Conflict - Cannot delete calendar with active dependencies",
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCalendar(
    @GetUser("id") userId: number,
    @Param("id", ParseIntPipe) calendarId: number
  ): Promise<void> {
    return this.calendarsService.deleteCalendar(userId, calendarId);
  }

  /**
   * Sync calendar with external source
   * 
   * Triggers a manual sync operation to fetch latest events
   * from the connected external calendar service.
   * 
   * Useful for:
   * - Immediate updates after external changes
   * - Troubleshooting sync issues
   * - Initial calendar population
   */
  @Post(":id/sync")
  @ApiOperation({
    summary: "Sync calendar",
    description: "Manually trigger a sync operation with the external calendar source",
  })
  @ApiParam({
    name: "id",
    type: Number,
    description: "Calendar ID",
  })
  @ApiResponse({
    status: 200,
    description: "Calendar sync initiated successfully",
    type: CalendarResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Calendar not found",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Invalid or missing access token",
  })
  @ApiResponse({
    status: 503,
    description: "Service unavailable - External calendar service unreachable",
  })
  async syncCalendar(
    @GetUser("id") userId: number,
    @Param("id", ParseIntPipe) calendarId: number
  ): Promise<CalendarResponseDto> {
    return this.calendarsService.syncCalendar(userId, calendarId);
  }

  /**
   * Set calendar as primary
   * 
   * Designates a calendar as the primary/default calendar for the user.
   * The primary calendar is used by default for new events and bookings.
   * 
   * Only one calendar can be primary at a time.
   */
  @Post(":id/set-primary")
  @ApiOperation({
    summary: "Set calendar as primary",
    description: "Designate a calendar as the user's primary/default calendar",
  })
  @ApiParam({
    name: "id",
    type: Number,
    description: "Calendar ID",
  })
  @ApiResponse({
    status: 200,
    description: "Calendar set as primary successfully",
    type: CalendarResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Calendar not found",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Invalid or missing access token",
  })
  async setPrimaryCalendar(
    @GetUser("id") userId: number,
    @Param("id", ParseIntPipe) calendarId: number
  ): Promise<CalendarResponseDto> {
    return this.calendarsService.setPrimaryCalendar(userId, calendarId);
  }
}