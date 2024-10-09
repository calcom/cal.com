import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsOptional, IsString } from "class-validator";

export class RescheduleBookingInput_2024_08_13 {
  @IsDateString()
  @ApiProperty({
    description: "Start time in ISO 8601 format for the new booking",
    example: "2024-08-13T10:00:00Z",
  })
  start!: string;

  @IsString()
  @IsOptional()
  @ApiProperty({
    example: "User requested reschedule",
    description: "Reason for rescheduling the booking",
    required: false,
  })
  reschedulingReason?: string;
}
