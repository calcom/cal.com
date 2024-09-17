import { IsBoolean, IsNumber, IsOptional } from "class-validator";

import type { AppsStatus } from "@calcom/platform-libraries";

import { CreateBookingInput } from "./create-booking.input";

export class CreateRecurringBookingInput extends CreateBookingInput {
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
}
