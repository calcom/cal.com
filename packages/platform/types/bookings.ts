import { Type, Transform } from "class-transformer";
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

type BookingStatus = `${Status}`;

class Filters {
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  teamsIds?: number[];

  @IsOptional()
  @IsArray()
  @Type(() => Number)
  userIds?: number[];

  @IsEnum(Status)
  status!: BookingStatus;

  @IsOptional()
  @IsArray()
  @Type(() => Number)
  eventTypeIds?: number[];
}

export class GetBookingsInput {
  @ValidateNested({ each: true })
  @Type(() => Filters)
  filters!: Filters;

  @Transform(({ value }: { value: string }) => value && parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @Transform(({ value }: { value: string }) => value && parseInt(value))
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
