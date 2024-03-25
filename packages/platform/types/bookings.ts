import { Type } from "class-transformer";
import {
  ValidateNested,
  IsNumber,
  Min,
  Max,
  IsOptional,
  IsArray,
  IsEnum,
  IsBoolean,
  IsString,
} from "class-validator";

enum Status {
  upcoming = "upcoming",
  recurring = "recurring",
  past = "past",
  cancelled = "cancelled",
  unconfirmed = "unconfirmed",
}

class Filters {
  @IsArray()
  @Type(() => Number)
  teamsIds?: number[];

  @IsArray()
  @Type(() => Number)
  userIds?: number[];

  @IsEnum(Status)
  status!: Status;

  @IsArray()
  @Type(() => Number)
  eventTypeIds?: number[];
}

export class GetBookingsInput {
  @ValidateNested({ each: true })
  filters!: Filters;

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @IsNumber()
  @IsOptional()
  cursor?: number | null;
}

export class CancelBookingInput {
  @IsNumber()
  @IsOptional()
  id?: number;

  @IsString()
  @IsOptional()
  uid?: string;

  @IsBoolean()
  @IsOptional()
  allRemainingBookings?: boolean;

  @IsString()
  @IsOptional()
  cancellationReason?: string;

  @IsString()
  @IsOptional()
  seatReferenceUid?: string;
}
