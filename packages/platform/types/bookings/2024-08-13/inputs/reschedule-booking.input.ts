import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsOptional, IsString, Validate, isEmail } from "class-validator";

export const RESCHEDULED_BY_DOCS = `Email of the person who is rescheduling the booking - only needed when rescheduling a booking that requires a confirmation.
If event type owner email is provided then rescheduled booking will be automatically confirmed. If attendee email or no email is passed then the event type
owner will have to confirm the rescheduled booking.`;

export class RescheduleBookingInput_2024_08_13 {
  @IsDateString()
  @ApiProperty({
    description: "Start time in ISO 8601 format for the new booking",
    example: "2024-08-13T10:00:00Z",
  })
  start!: string;

  @IsOptional()
  @ApiPropertyOptional({ description: RESCHEDULED_BY_DOCS })
  @Validate((value: string) => !value || isEmail(value), {
    message: "Invalid rescheduledBy email format",
  })
  rescheduledBy?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    example: "User requested reschedule",
    description: "Reason for rescheduling the booking",
  })
  reschedulingReason?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    type: String,
    description: "Email verification code required when event type has email verification enabled.",
    example: "123456",
  })
  emailVerificationCode?: string;

  @ApiPropertyOptional({
    type: String,
    description:
      "Reserved slot uid for the rescheduled booking. If passed will prevent double bookings by checking that someone else has not reserved the same slot. If there is another reserved slot for the same time we will check if it is not expired and which one was reserved first. If the other reserved slot is expired we will allow the booking to proceed. If there are no reserved slots for the same time we will allow the booking to proceed.",
    example: "430a2525-08e4-456d-a6b7-95ec2b0d22fb",
  })
  @IsOptional()
  @IsString()
  reservedSlotUid?: string;
}

export class RescheduleSeatedBookingInput_2024_08_13 {
  @IsDateString()
  @ApiProperty({
    description: "Start time in ISO 8601 format for the new booking",
    example: "2024-08-13T10:00:00Z",
  })
  start!: string;

  @IsOptional()
  @ApiPropertyOptional({ description: RESCHEDULED_BY_DOCS })
  @Validate((value: string) => !value || isEmail(value), {
    message: "Invalid rescheduledBy email format",
  })
  rescheduledBy?: string;

  @ApiProperty({
    type: String,
    example: "3be561a9-31f1-4b8e-aefc-9d9a085f0dd1",
    description: "Uid of the specific seat within booking.",
  })
  @IsString()
  seatUid!: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    type: String,
    description: "Email verification code required when event type has email verification enabled.",
    example: "123456",
  })
  emailVerificationCode?: string;
}
