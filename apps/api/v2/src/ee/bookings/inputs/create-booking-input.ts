import { IsBoolean, IsNumber, IsString, IsOptional, IsArray } from "class-validator";

import { TimeZone } from "@calcom/platform-constants";

export class CreateBookingInput {
  @IsString()
  @IsOptional()
  end?: string;

  @IsString()
  start!: string;

  @IsNumber()
  eventTypeId!: number;

  @IsString()
  @IsOptional()
  eventTypeSlug?: string;

  @IsString()
  @IsOptional()
  rescheduleUid?: string;

  @IsString()
  @IsOptional()
  recurringEventId?: string;

  @IsString()
  timeZone!: TimeZone;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  user?: string | string[];

  @IsString()
  language!: string;

  @IsString()
  @IsOptional()
  bookingUid?: string;

  metadata!: Record<string, string>;

  @IsBoolean()
  @IsOptional()
  hasHashedBookingLink?: boolean;

  @IsString()
  hashedLink!: string | null;

  @IsString()
  @IsOptional()
  seatReferenceUid?: string;
}
