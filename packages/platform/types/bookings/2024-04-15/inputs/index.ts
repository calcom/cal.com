import { ApiProperty } from "@nestjs/swagger";
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

export enum Status_2024_04_15 {
  upcoming = "upcoming",
  recurring = "recurring",
  past = "past",
  cancelled = "cancelled",
  unconfirmed = "unconfirmed",
}

type BookingStatus = `${Status_2024_04_15}`;

class Filters {
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  teamsIds?: number[];

  @IsOptional()
  @IsArray()
  @Type(() => Number)
  userIds?: number[];

  @IsEnum(Status_2024_04_15)
  status!: BookingStatus;

  @IsOptional()
  @IsArray()
  @Type(() => Number)
  eventTypeIds?: number[];
}

export class GetBookingsInput_2024_04_15 {
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

export class CancelBookingInput_2024_04_15 {
  @IsNumber()
  @IsOptional()
  @ApiProperty()
  id?: number;

  @IsString()
  @IsOptional()
  @ApiProperty()
  uid?: string;

  @IsBoolean()
  @IsOptional()
  @ApiProperty()
  allRemainingBookings?: boolean;

  @IsString()
  @IsOptional()
  @ApiProperty()
  cancellationReason?: string;

  @IsString()
  @IsOptional()
  @ApiProperty()
  seatReferenceUid?: string;
}
