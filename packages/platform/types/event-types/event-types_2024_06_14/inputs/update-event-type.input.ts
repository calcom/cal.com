import { Type } from "class-transformer";
import { IsString, IsInt, IsBoolean, IsOptional, Min, ValidateNested, IsArray } from "class-validator";

import type { BookingField_2024_06_14 } from "./booking-fields.input";
import { ValidateBookingFields_2024_06_14 } from "./booking-fields.input";
import { Host } from "./create-event-type.input";
import { ValidateLocations_2024_06_14 } from "./locations.input";
import type { Location_2024_06_14 } from "./locations.input";

export class UpdateEventTypeInput_2024_06_14 {
  @IsOptional()
  @IsInt()
  @Min(1)
  lengthInMinutes?: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @ValidateLocations_2024_06_14()
  locations?: Location_2024_06_14[];

  @IsOptional()
  @ValidateBookingFields_2024_06_14()
  bookingFields?: BookingField_2024_06_14[];

  @IsBoolean()
  @IsOptional()
  disableGuests?: boolean;

  @IsInt()
  @IsOptional()
  slotInterval?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  minimumBookingNotice?: number;

  @IsInt()
  @IsOptional()
  beforeEventBuffer?: number;

  @IsInt()
  @IsOptional()
  afterEventBuffer?: number;
}
export class UpdateTeamEventTypeInput_2024_06_14 {
  @IsOptional()
  @IsInt()
  @Min(1)
  lengthInMinutes?: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @ValidateLocations_2024_06_14()
  locations?: Location_2024_06_14[];

  @IsOptional()
  @ValidateBookingFields_2024_06_14()
  bookingFields?: BookingField_2024_06_14[];

  @IsBoolean()
  @IsOptional()
  disableGuests?: boolean;

  @IsInt()
  @IsOptional()
  slotInterval?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  minimumBookingNotice?: number;

  @IsInt()
  @IsOptional()
  beforeEventBuffer?: number;

  @IsInt()
  @IsOptional()
  afterEventBuffer?: number;

  @ValidateNested({ each: true })
  @Type(() => Host)
  @IsArray()
  @IsOptional()
  hosts?: Host[];

  @IsBoolean()
  @IsOptional()
  assignAllTeamMembers?: boolean;
}
