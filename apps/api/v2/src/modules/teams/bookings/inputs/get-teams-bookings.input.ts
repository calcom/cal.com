import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  ArrayMinSize,
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";

enum Status {
  upcoming = "upcoming",
  recurring = "recurring",
  past = "past",
  cancelled = "cancelled",
  unconfirmed = "unconfirmed",
}
type StatusType = keyof typeof Status;

enum SortOrder {
  asc = "asc",
  desc = "desc",
}
type SortOrderType = keyof typeof SortOrder;

export class GetTeamsBookingsInput_2024_08_13 {
  
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === "string") {
      return value.split(",").map((status: string) => status.trim());
    }
    return value;
  })
  @ArrayNotEmpty({ message: "status cannot be empty." })
  @IsEnum(Status, {
    each: true,
    message: "Invalid status. Allowed are upcoming, recurring, past, cancelled, unconfirmed",
  })
  @ApiProperty({
    required: false,
    description:
      "Filter bookings by status. If you want to filter by multiple statuses, separate them with a comma.",
    example: "?status=upcoming,past",
    enum: Status,
    isArray: true,
  })
  status?: StatusType[];

  @IsString()
  @IsOptional()
  @ApiProperty({
    type: String,
    required: false,
    description: "Filter bookings by the attendee's email address.",
    example: "example@domain.com",
  })
  attendeeEmail?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    type: String,
    required: false,
    description: "Filter bookings by the attendee's name.",
    example: "John Doe",
  })
  attendeeName?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    type: String,
    required: false,
    description: "Filter bookings by the booking Uid.",
    example: "2NtaeaVcKfpmSZ4CthFdfk",
  })
  bookingUid?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === "string") {
      return value.split(",").map((eventTypeId: string) => parseInt(eventTypeId, 10));
    }
    return value;
  })
  @IsArray()
  @IsNumber({}, { each: true })
  @ArrayMinSize(1, { message: "eventTypeIds must contain at least 1 event type id" })
  @ApiProperty({
    type: String,
    required: false,
    description:
      "Filter bookings by event type ids belonging to the team. Event type ids must be separated by a comma.",
    example: "100,200",
  })
  eventTypeIds?: number[];

  @IsOptional()
  @IsISO8601({ strict: true }, { message: "afterStart must be a valid ISO 8601 date." })
  @ApiProperty({
    type: String,
    required: false,
    description: "Filter bookings that start after this date-time (ISO 8601).",
    example: "2024-08-13T10:00:00.000Z",
  })
  afterStart?: string;

  @IsOptional()
  @IsISO8601({ strict: true }, { message: "beforeEnd must be a valid ISO 8601 date." })
  @ApiProperty({
    type: String,
    required: false,
    description: "Filter bookings that end before this date-time (ISO 8601).",
    example: "2024-08-20T10:00:00.000Z",
  })
  beforeEnd?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === "string") {
      return value.split(",").map((id: string) => parseInt(id, 10));
    }
    return value;
  })
  @IsArray()
  @IsInt({ each: true })
  @ArrayMinSize(1, { message: "teamMemberIds must contain at least 1 id" })
  @ApiProperty({
    type: String,
    required: false,
    description:
      "Filter bookings by team member user ids. Multiple ids can be separated by a comma. Only works for team events.",
    example: "10,20",
  })
  teamMemberIds?: number[];

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === "string") {
      return value.split(",").map((email: string) => email.trim());
    }
    return value;
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1, { message: "teamMemberEmails must contain at least 1 email" })
  @ApiProperty({
    type: String,
    required: false,
    description:
      "Filter bookings by team member emails. Multiple emails can be separated by a comma. Only works for team events.",
    example: "alice@example.com,bob@example.com",
  })
  teamMemberEmails?: string[];

  // note(Lauris): sort
  @IsOptional()
  @IsEnum(SortOrder, {
    message: 'SortStart must be either "asc" or "desc".',
  })
  @ApiProperty({
    required: false,
    description:
      "Sort results by their start time (when booking is scheduled for) in ascending or descending order.",
    example: "?sortStart=asc OR ?sortStart=desc",
    enum: SortOrder,
  })
  sortStart?: SortOrderType;

  @IsOptional()
  @IsEnum(SortOrder, {
    message: 'SortEnd must be either "asc" or "desc".',
  })
  @ApiProperty({
    required: false,
    description:
      "Sort results by their end time (when booking is scheduled to end) in ascending or descending order.",
    example: "?sortEnd=asc OR ?sortEnd=desc",
    enum: SortOrder,
  })
  sortEnd?: SortOrderType;

  @IsOptional()
  @IsEnum(SortOrder, {
    message: 'SortCreated must be either "asc" or "desc".',
  })
  @ApiProperty({
    required: false,
    description:
      "Sort results by their creation time (when booking was made) in ascending or descending order.",
    example: "?sortCreated=asc OR ?sortCreated=desc",
    enum: SortOrder,
  })
  sortCreated?: SortOrderType;

  
  @ApiProperty({ required: false, description: "The number of items to return", example: 10 })
  @Transform(({ value }: { value: string }) => value && parseInt(value, 10))
  @IsNumber()
  @Min(1)
  @Max(250)
  @IsOptional()
  take?: number;

  @ApiProperty({ required: false, description: "The number of items to skip", example: 0 })
  @Transform(({ value }: { value: string }) => value && parseInt(value, 10))
  @IsNumber()
  @Min(0)
  @IsOptional()
  skip?: number;
}
