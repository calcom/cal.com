import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
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
  status?: StatusType[];

  @IsString()
  @IsOptional()
  attendeeEmail?: string;

  @IsString()
  @IsOptional()
  attendeeName?: string;

  @IsArray()
  @Type(() => Number)
  @IsOptional()
  @ArrayMinSize(1, { message: "eventTypeIds must contain at least 1 event type id" })
  eventTypeIds?: number[];

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  eventTypeId?: number;

  @IsArray()
  @Type(() => Number)
  @IsOptional()
  @ArrayMinSize(1, { message: "teamIds must contain at least 1 team id" })
  teamsIds?: number[];

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  teamId?: number;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(2, { message: "dateRange must contain 2 dates - from and to." })
  @ArrayMaxSize(2, { message: "dateRange must contain 2 dates - from and to." })
  @ArrayNotEmpty({ message: "dateRange cannot be empty." })
  @IsISO8601(
    { strict: true },
    { each: true, message: "Each date in dateRange must be a valid ISO 8601 date." }
  )
  dateRange?: [string, string];

  @IsOptional()
  @IsISO8601({ strict: true }, { message: "fromDate must be a valid ISO 8601 date." })
  fromDate?: string;

  @IsOptional()
  @IsISO8601({ strict: true }, { message: "toDate must be a valid ISO 8601 date." })
  toDate?: string;

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
  @Transform(({ value }: { value: string }) => value && parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @Transform(({ value }: { value: string }) => value && parseInt(value))
  @IsNumber()
  @IsOptional()
  cursor?: number;
}
