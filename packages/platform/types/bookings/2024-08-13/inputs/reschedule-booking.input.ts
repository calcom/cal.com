import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsOptional, IsString, IsEmail } from "class-validator";

const RESCHEDULED_BY_DOCS = `Who is rescheduling the booking. If it is the event type owner then pass his / her email because if it is a booking that requires
    a confirmation we need to know who reschedules it and if it is attendee rescheduling then a confirmation will be required. If attendee is rescheduling don't pass anything.`;

export class RescheduleBookingInput_2024_08_13 {
  @IsDateString()
  @ApiProperty({
    description: "Start time in ISO 8601 format for the new booking",
    example: "2024-08-13T10:00:00Z",
  })
  start!: string;

  @IsEmail()
  @IsOptional()
  @ApiPropertyOptional({ description: RESCHEDULED_BY_DOCS })
  rescheduledBy?: string;

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

  @IsEmail()
  @IsOptional()
  @ApiPropertyOptional({ description: RESCHEDULED_BY_DOCS })
  rescheduledBy?: string;

  @ApiProperty({
    type: String,
    example: "3be561a9-31f1-4b8e-aefc-9d9a085f0dd1",
    description: "Uid of the specific seat within booking.",
  })
  @IsString()
  seatUid!: string;
}
