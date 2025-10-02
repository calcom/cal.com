import { CreateAttendeeInput_2024_09_04 } from "@/ee/attendees/2024-09-04/inputs/create-attendee.input";
import { UpdateAttendeeInput_2024_09_04 } from "@/ee/attendees/2024-09-04/inputs/update-attendee.input";
import {
  CreateAttendeeOutput_2024_09_04,
  UpdateAttendeeOutput_2024_09_04,
  GetAttendeeOutput_2024_09_04,
  DeleteAttendeeOutput_2024_09_04,
  AttendeeOutput_2024_09_04,
} from "@/ee/attendees/2024-09-04/outputs/attendee.output";
import { AttendeesService_2024_09_04 } from "@/ee/attendees/2024-09-04/services/attendees.service";
import { VERSION_2024_09_04_VALUE } from "@/lib/api-versions";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Permissions } from "@/modules/auth/decorators/permissions/permissions.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { ApiAuthGuardUser } from "@/modules/auth/strategies/api-auth/api-auth.strategy";
import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { ApiOperation, ApiTags as DocsTags, ApiParam } from "@nestjs/swagger";
import { plainToClass } from "class-transformer";

import { BOOKING_READ, BOOKING_WRITE, SUCCESS_STATUS } from "@calcom/platform-constants";

@Controller({
  path: "/v2/attendees",
  version: VERSION_2024_09_04_VALUE,
})
@UseGuards(PermissionsGuard)
@DocsTags("Attendees")
export class AttendeesController_2024_09_04 {
  private readonly logger = new Logger("AttendeesController_2024_09_04");

  constructor(private readonly attendeesService: AttendeesService_2024_09_04) {}

  @Post("/")
  @UseGuards(ApiAuthGuard)
  @Permissions([BOOKING_WRITE])
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Create an attendee",
    description: `
      Creates a new attendee for an existing booking. The user must be the owner of the booking 
      or have appropriate permissions (team member for team bookings, or system admin).
    `,
  })
  async createAttendee(
    @Body() body: CreateAttendeeInput_2024_09_04,
    @GetUser() user: ApiAuthGuardUser
  ): Promise<CreateAttendeeOutput_2024_09_04> {
    const attendee = await this.attendeesService.createAttendee(body, user);
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(AttendeeOutput_2024_09_04, attendee, { strategy: "excludeAll" }),
    };
  }

  @Get("/:attendeeId")
  @UseGuards(ApiAuthGuard)
  @Permissions([BOOKING_READ])
  @ApiOperation({
    summary: "Get an attendee by ID",
    description: `
      Retrieves an attendee by their ID. The user must have permission to view the booking
      that the attendee belongs to.
    `,
  })
  @ApiParam({
    name: "attendeeId",
    description: "The ID of the attendee to retrieve",
    type: "number",
  })
  async getAttendee(
    @Param("attendeeId") attendeeId: string,
    @GetUser() user: ApiAuthGuardUser
  ): Promise<GetAttendeeOutput_2024_09_04> {
    const id = parseInt(attendeeId, 10);
    if (isNaN(id)) {
      throw new Error("Invalid attendee ID");
    }
    const attendee = await this.attendeesService.getAttendeeById(id, user);
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(AttendeeOutput_2024_09_04, attendee, { strategy: "excludeAll" }),
    };
  }

  @Patch("/:attendeeId")
  @UseGuards(ApiAuthGuard)
  @Permissions([BOOKING_WRITE])
  @ApiOperation({
    summary: "Update an attendee",
    description: `
      Updates an existing attendee by their ID. The user must have permission to modify the booking
      that the attendee belongs to. Only provided fields will be updated.
    `,
  })
  @ApiParam({
    name: "attendeeId",
    description: "The ID of the attendee to update",
    type: "number",
  })
  async updateAttendee(
    @Param("attendeeId") attendeeId: string,
    @Body() body: UpdateAttendeeInput_2024_09_04,
    @GetUser() user: ApiAuthGuardUser
  ): Promise<UpdateAttendeeOutput_2024_09_04> {
    const id = parseInt(attendeeId, 10);
    if (isNaN(id)) {
      throw new Error("Invalid attendee ID");
    }
    const attendee = await this.attendeesService.updateAttendee(id, body, user);
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(AttendeeOutput_2024_09_04, attendee, { strategy: "excludeAll" }),
    };
  }

  @Delete("/:attendeeId")
  @UseGuards(ApiAuthGuard)
  @Permissions([BOOKING_WRITE])
  @ApiOperation({
    summary: "Delete an attendee",
    description: `
      Deletes an attendee by their ID. The user must have permission to modify the booking 
      that the attendee belongs to.
    `,
  })
  @ApiParam({
    name: "attendeeId",
    description: "The ID of the attendee to delete",
    type: "number",
  })
  async deleteAttendee(
    @Param("attendeeId") attendeeId: string,
    @GetUser() user: ApiAuthGuardUser
  ): Promise<DeleteAttendeeOutput_2024_09_04> {
    const id = parseInt(attendeeId, 10);
    if (isNaN(id)) {
      throw new Error("Invalid attendee ID");
    }
    const attendee = await this.attendeesService.deleteAttendee(id, user);
    return {
      status: SUCCESS_STATUS,
      data: plainToClass(AttendeeOutput_2024_09_04, attendee, { strategy: "excludeAll" }),
    };
  }
}
