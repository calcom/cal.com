import { ApiProperty as DocsProperty } from "@nestjs/swagger";
import { IsString, IsInt, IsBoolean, IsOptional, Min } from "class-validator";

import type { BookingField } from "./booking-fields.input";
import { ValidateBookingFields } from "./booking-fields.input";
import { ValidateLocations } from "./locations.input";
import type { Location } from "./locations.input";

export const CREATE_EVENT_LENGTH_EXAMPLE = 60;
export const CREATE_EVENT_TITLE_EXAMPLE = "Learn the secrets of masterchief!";
export const CREATE_EVENT_DESCRIPTION_EXAMPLE =
  "Discover the culinary wonders of the Argentina by making the best flan ever!";
export class CreateEventTypeInput {
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
  @ValidateLocations()
  locations?: Location[];

  @IsOptional()
  @ValidateBookingFields()
  bookingFields?: BookingField[];

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
