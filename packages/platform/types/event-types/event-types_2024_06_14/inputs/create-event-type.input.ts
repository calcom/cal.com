import { ApiProperty as DocsProperty } from "@nestjs/swagger";
import { IsString, IsInt, IsBoolean, IsOptional, Min } from "class-validator";

import type { BookingField_2024_06_14 } from "./booking-fields.input";
import { ValidateBookingFields_2024_06_14 } from "./booking-fields.input";
import { ValidateLocations_2024_06_14 } from "./locations.input";
import type { Location_2024_06_14 } from "./locations.input";

export const CREATE_EVENT_LENGTH_EXAMPLE = 60;
export const CREATE_EVENT_TITLE_EXAMPLE = "Learn the secrets of masterchief!";
export const CREATE_EVENT_DESCRIPTION_EXAMPLE =
  "Discover the culinary wonders of the Argentina by making the best flan ever!";
export class CreateEventTypeInput_2024_06_14 {
  @IsInt()
  @Min(1)
  @DocsProperty({ example: CREATE_EVENT_LENGTH_EXAMPLE })
  lengthInMinutes!: number;

  @IsString()
  @DocsProperty({ example: CREATE_EVENT_TITLE_EXAMPLE })
  title!: string;

  @IsOptional()
  @IsString()
  @DocsProperty({ example: CREATE_EVENT_DESCRIPTION_EXAMPLE })
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
