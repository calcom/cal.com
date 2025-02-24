import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
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
  @ApiPropertyOptional({
    example: "User requested reschedule",
    description: "Reason for rescheduling the booking",
  })
  reschedulingReason?: string;
}

export class RescheduleSeatedBookingInput_2024_08_13 {
  @IsDateString()
  @ApiProperty({
    description: "Start time in ISO 8601 format for the new booking",
    example: "2024-08-13T10:00:00Z",
  })
  start!: string;

  @ApiProperty({
    type: String,
    example: "3be561a9-31f1-4b8e-aefc-9d9a085f0dd1",
    description: "Uid of the specific seat within booking.",
  })
  @IsString()
  seatUid!: string;
}
