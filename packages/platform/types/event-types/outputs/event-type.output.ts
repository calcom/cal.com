import { ApiProperty as DocsProperty } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, IsString, Min } from "class-validator";

import {
  CREATE_EVENT_DESCRIPTION_EXAMPLE,
  CREATE_EVENT_LENGTH_EXAMPLE,
  CREATE_EVENT_TITLE_EXAMPLE,
  ValidateBookingFields,
  ValidateLocations,
} from "@calcom/platform-types";
import type { Location, BookingField } from "@calcom/platform-types";

export class EventTypeOutput {
  @IsInt()
  @DocsProperty({ example: 1 })
  id!: number;

  @IsInt()
  ownerId!: number;

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
  description?: string | null;

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
  slotInterval?: number | null;

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
