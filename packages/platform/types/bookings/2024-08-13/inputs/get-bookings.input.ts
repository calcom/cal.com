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
    required: false,
    description: "Filter bookings by the attendee's email address.",
    example: "example@domain.com",
  })
  attendeeEmail?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    required: false,
    description: "Filter bookings by the attendee's name.",
    example: "John Doe",
  })
  attendeeName?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === "string") {
      return value.split(",").map((eventTypeId: string) => parseInt(eventTypeId));
    }
    return value;
  })
  @IsArray()
  @IsNumber({}, { each: true })
  @ArrayMinSize(1, { message: "eventTypeIds must contain at least 1 event type id" })
  eventTypeIds?: number[];

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  eventTypeId?: number;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === "string") {
      return value.split(",").map((teamId: string) => parseInt(teamId));
    }
    return value;
  })
  @IsArray()
  @IsNumber({}, { each: true })
  @ArrayMinSize(1, { message: "teamIds must contain at least 1 team id" })
  teamsIds?: number[];

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  teamId?: number;

  @IsOptional()
  @IsISO8601({ strict: true }, { message: "fromDate must be a valid ISO 8601 date." })
  afterStart?: string;

  @IsOptional()
  @IsISO8601({ strict: true }, { message: "toDate must be a valid ISO 8601 date." })
  beforeEnd?: string;

  // note(Lauris): sort
  @IsOptional()
  @IsEnum(SortOrder, {
    message: 'SortStart must be either "asc" or "desc".',
  })
  sortStart?: SortOrderType;

  @IsOptional()
  @IsEnum(SortOrder, {
    message: 'SortEnd must be either "asc" or "desc".',
  })
  sortEnd?: SortOrderType;

  @IsOptional()
  @IsEnum(SortOrder, {
    message: 'SortCreated must be either "asc" or "desc".',
  })
  sortCreated?: SortOrderType;

  // note(Lauris): pagination
  @ApiProperty({ required: false, description: "The number of items to return", example: 10 })
  @Transform(({ value }: { value: string }) => value && parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(250)
  @IsOptional()
  take?: number;

  @ApiProperty({ required: false, description: "The number of items to skip", example: 0 })
  @Transform(({ value }: { value: string }) => value && parseInt(value))
  @IsNumber()
  @Min(0)
  @IsOptional()
  skip?: number;
}
