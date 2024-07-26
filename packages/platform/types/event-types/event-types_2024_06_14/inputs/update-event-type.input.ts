import { ApiProperty as DocsProperty } from "@nestjs/swagger";
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

  @IsInt()
  @IsOptional()
  scheduleId?: number;
}
export class UpdateTeamEventTypeInput_2024_06_14 {
  @IsOptional()
  @IsInt()
  @Min(1)
  @DocsProperty()
  lengthInMinutes?: number;

  @IsOptional()
  @IsString()
  @DocsProperty()
  title?: string;

  @IsString()
  @IsOptional()
  @DocsProperty()
  slug?: string;

  @IsOptional()
  @IsString()
  @DocsProperty()
  description?: string;

  @IsOptional()
  @ValidateLocations_2024_06_14()
  @DocsProperty()
  locations?: Location_2024_06_14[];

  @IsOptional()
  @ValidateBookingFields_2024_06_14()
  @DocsProperty()
  bookingFields?: BookingField_2024_06_14[];

  @IsBoolean()
  @IsOptional()
  @DocsProperty()
  disableGuests?: boolean;

  @IsInt()
  @IsOptional()
  @DocsProperty()
  slotInterval?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  @DocsProperty()
  minimumBookingNotice?: number;

  @IsInt()
  @IsOptional()
  @DocsProperty()
  beforeEventBuffer?: number;

  @IsInt()
  @IsOptional()
  @DocsProperty()
  afterEventBuffer?: number;

  @ValidateNested({ each: true })
  @Type(() => Host)
  @IsArray()
  @IsOptional()
  @DocsProperty()
  hosts?: Host[];

  @IsBoolean()
  @IsOptional()
  @DocsProperty()
  assignAllTeamMembers?: boolean;
}
