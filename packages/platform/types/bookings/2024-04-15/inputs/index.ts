import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
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
  @ApiPropertyOptional({ type: [Number] })
  teamsIds?: number[];

  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @ApiPropertyOptional({ type: [Number] })
  userIds?: number[];

  @IsEnum(Status_2024_04_15)
  @ApiProperty({ enum: Status_2024_04_15 })
  status!: BookingStatus;

  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @ApiPropertyOptional({ type: [Number] })
  eventTypeIds?: number[];
}

export class GetBookingsInput_2024_04_15 {
  @ValidateNested({ each: true })
  @Type(() => Filters)
  @ApiProperty({ type: Filters })
  filters!: Filters;

  @Transform(({ value }: { value: string }) => value && parseInt(value))
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  @ApiPropertyOptional({ description: "Maximum number of bookings to retrieve.", example: 50 })
  limit?: number;

  @Transform(({ value }: { value: string }) => value && parseInt(value))
  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ description: "Cursor for pagination.", example: 10, nullable: true })
  cursor?: number | null;
}

export class CancelBookingInput_2024_04_15 {
  @IsNumber()
  @IsOptional()
  @ApiPropertyOptional({ description: "Booking ID to cancel.", example: 123 })
  id?: number;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  uid?: string;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({
    example: true,
  })
  allRemainingBookings?: boolean;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    type: String,
    description: "Reason for cancellation.",
    example: "Scheduling conflict",
  })
  cancellationReason?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  seatReferenceUid?: string;
}
