import { ApiHideProperty, ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsDateString, IsInt, IsOptional, IsString, isEmail, Validate } from "class-validator";

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

  @ApiHideProperty()
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  rrHostSubsetIds?: number[];
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
