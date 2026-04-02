import type { AppsStatus } from "@calcom/platform-libraries/app-store";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsNumber, IsOptional, IsString } from "class-validator";
import { CreateBookingInput_2024_04_15 } from "@/ee/bookings/2024-04-15/inputs/create-booking.input";

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
  allRecurringDates?: { start: string; end: string | undefined }[];

  @IsOptional()
  @IsNumber()
  @ApiPropertyOptional()
  currentRecurringIndex?: number;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  recurringEventId?: string;
}
