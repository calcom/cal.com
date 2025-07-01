import { ApiProperty } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
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

export class GetBookingsInput_2024_08_13 {
  // note(Lauris): filters
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
  @Transform(({ value }) => {
    if (typeof value === "string") {
      // note(Lauris): we replace inner white spaces with "+" because managed user emails have "+" in them but if they are not URL encoded
      // when making request "+" becomes empty space " ".
      return value.trim().replace(/\s+/g, "+");
    }
    return value;
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
      return value.split(",").map((eventTypeId: string) => parseInt(eventTypeId));
    }
    if (Array.isArray(value)) {
      return value.map((eventTypeId: string | number) => +eventTypeId);
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
      "Filter bookings by event type ids belonging to the user. Event type ids must be separated by a comma.",
    example: "?eventTypeIds=100,200",
  })
  eventTypeIds?: number[];

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  @ApiProperty({
    type: String,
    required: false,
    description: "Filter bookings by event type id belonging to the user.",
    example: "?eventTypeId=100",
  })
  eventTypeId?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === "string") {
      return value.split(",").map((teamId: string) => parseInt(teamId));
    }
    if (Array.isArray(value)) {
      return value.map((teamId: string | number) => +teamId);
    }
    return value;
  })
  @IsArray()
  @IsNumber({}, { each: true })
  @ArrayMinSize(1, { message: "teamIds must contain at least 1 team id" })
  @ApiProperty({
    type: String,
    required: false,
    description: "Filter bookings by team ids that user is part of. Team ids must be separated by a comma.",
    example: "?teamIds=50,60",
  })
  teamsIds?: number[];

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  @ApiProperty({
    type: String,
    required: false,
    description: "Filter bookings by team id that user is part of",
    example: "?teamId=50",
  })
  teamId?: number;

  @IsOptional()
  @IsISO8601({ strict: true }, { message: "fromDate must be a valid ISO 8601 date." })
  @ApiProperty({
    type: String,
    required: false,
    description: "Filter bookings with start after this date string.",
    example: "?afterStart=2025-03-07T10:00:00.000Z",
  })
  afterStart?: string;

  @IsOptional()
  @IsISO8601({ strict: true }, { message: "toDate must be a valid ISO 8601 date." })
  @ApiProperty({
    type: String,
    required: false,
    description: "Filter bookings with end before this date string.",
    example: "?beforeEnd=2025-03-07T11:00:00.000Z",
  })
  beforeEnd?: string;

  @IsOptional()
  @IsISO8601({ strict: true }, { message: "fromDate must be a valid ISO 8601 date." })
  @ApiProperty({
    type: String,
    required: false,
    description: "Filter bookings that have been created after this date string.",
    example: "?afterCreatedAt=2025-03-07T10:00:00.000Z",
  })
  afterCreatedAt?: string;

  @IsOptional()
  @IsISO8601({ strict: true }, { message: "toDate must be a valid ISO 8601 date." })
  @ApiProperty({
    type: String,
    required: false,
    description: "Filter bookings that have been created before this date string.",
    example: "?beforeCreatedAt=2025-03-14T11:00:00.000Z",
  })
  beforeCreatedAt?: string;

  @IsOptional()
  @IsISO8601({ strict: true }, { message: "fromDate must be a valid ISO 8601 date." })
  @ApiProperty({
    type: String,
    required: false,
    description: "Filter bookings that have been updated after this date string.",
    example: "?afterUpdatedAt=2025-03-07T10:00:00.000Z",
  })
  afterUpdatedAt?: string;

  @IsOptional()
  @IsISO8601({ strict: true }, { message: "toDate must be a valid ISO 8601 date." })
  @ApiProperty({
    type: String,
    required: false,
    description: "Filter bookings that have been updated before this date string.",
    example: "?beforeUpdatedAt=2025-03-14T11:00:00.000Z",
  })
  beforeUpdatedAt?: string;

  // note(Lauris): sort
  @IsOptional()
  @IsEnum(SortOrder, {
    message: 'SortStart must be either "asc" or "desc".',
  })
  @ApiProperty({
    required: false,
    description: "Sort results by their start time in ascending or descending order.",
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
    description: "Sort results by their end time in ascending or descending order.",
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

  @IsOptional()
  @IsEnum(SortOrder, {
    message: 'SortCreated must be either "asc" or "desc".',
  })
  @ApiProperty({
    required: false,
    description:
      "Sort results by their updated time (for example when booking status changes) in ascending or descending order.",
    example: "?sortUpdated=asc OR ?sortUpdated=desc",
    enum: SortOrder,
  })
  sortUpdatedAt?: SortOrderType;

  // note(Lauris): pagination
  @ApiProperty({ required: false, description: "The number of items to return", example: 10, default: 100 })
  @Transform(({ value }: { value: string }) => value && parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(250)
  @IsOptional()
  take?: number;

  @ApiProperty({ required: false, description: "The number of items to skip", example: 0, default: 0 })
  @Transform(({ value }: { value: string }) => value && parseInt(value))
  @IsNumber()
  @Min(0)
  @IsOptional()
  skip?: number;
}
