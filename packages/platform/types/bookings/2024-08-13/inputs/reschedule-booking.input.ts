import { IsDateString, IsOptional, IsString } from "class-validator";

export class RescheduleBookingInput_2024_08_13 {
  @IsDateString()
  start!: string;

  @IsString()
  @IsOptional()
  reschedulingReason?: string;
}
