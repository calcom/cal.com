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
  accepted = "accepted",
  cancelled = "cancelled",
  rejected = "rejected",
  pending = "pending",
  upcoming = "upcoming",
  recurring = "recurring",
  past = "past",
  unconfirmed = "unconfirmed",
  "!accepted" = "!accepted",
  "!cancelled" = "!cancelled",
  "!rejected" = "!rejected",
  "!pending" = "!pending",
  "!upcoming" = "!upcoming",
  "!recurring" = "!recurring",
  "!past" = "!past",
  "!unconfirmed" = "!unconfirmed",
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
  @IsEnum(Status)
  @IsOptional()
  status?: StatusType;

  @IsString()
  @IsOptional()
  attendeeEmail?: string;

  @IsArray()
  @Type(() => Number)
  @IsOptional()
  eventTypeIds?: number[];

  @IsInt()
  @IsOptional()
  eventTypeId?: number;

  @IsArray()
  @Type(() => Number)
  @IsOptional()
  teamsIds?: number[];

  @IsInt()
  @IsOptional()
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
