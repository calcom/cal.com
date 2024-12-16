import { CreateBookingInput_2024_04_15 } from "@/ee/bookings/2024-04-15/inputs/create-booking.input";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsString, IsNumber, IsOptional } from "class-validator";

import type { AppsStatus } from "@calcom/platform-libraries";

export class CreateRecurringBookingInput_2024_04_15 extends CreateBookingInput_2024_04_15 {
  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional()
  noEmail?: boolean;

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional()
  recurringCount?: number;

  @IsOptional()
  @ApiPropertyOptional({ type: [Object] })
  appsStatus?: AppsStatus[] | undefined;

  @IsOptional()
  @ApiPropertyOptional({ type: [Object] })
  allRecurringDates?: Record<string, string>[];

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional()
  currentRecurringIndex?: number;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  recurringEventId?: string;
}
