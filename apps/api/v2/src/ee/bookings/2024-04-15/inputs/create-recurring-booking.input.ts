import { CreateBookingInput_2024_04_15 } from "@/ee/bookings/2024-04-15/inputs/create-booking.input";
import { IsBoolean, IsString, IsNumber, IsOptional } from "class-validator";

import type { AppsStatus } from "@calcom/platform-libraries";

export class CreateRecurringBookingInput_2024_04_15 extends CreateBookingInput_2024_04_15 {
  @IsBoolean()
  @IsOptional()
  noEmail?: boolean;

  @IsOptional()
  @IsNumber()
  recurringCount?: number;

  @IsOptional()
  appsStatus?: AppsStatus[] | undefined;

  @IsOptional()
  allRecurringDates?: Record<string, string>[];

  @IsOptional()
  @IsNumber()
  currentRecurringIndex?: number;

  @IsString()
  @IsOptional()
  recurringEventId?: string;
}
