import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";

export enum ReportBookingReasonEnum {
  SPAM = "SPAM",
  DONT_KNOW_PERSON = "DONT_KNOW_PERSON",
  OTHER = "OTHER",
}

export enum ReportBookingTypeEnum {
  EMAIL = "EMAIL",
  DOMAIN = "DOMAIN",
}

export class ReportOrgBookingInput {
  @IsString()
  @ApiProperty({
    description: "The UID of the booking to report",
    example: "booking-uid-123",
  })
  bookingUid!: string;

  @IsNotEmpty()
  @IsEnum(ReportBookingReasonEnum)
  @ApiProperty({
    enum: ReportBookingReasonEnum,
    description: "The reason for reporting the booking",
    example: ReportBookingReasonEnum.SPAM,
  })
  reason!: ReportBookingReasonEnum;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: "Additional description for the report",
  })
  description?: string;

  @IsEnum(ReportBookingTypeEnum)
  @ApiProperty({
    enum: ReportBookingTypeEnum,
    description:
      "Whether to report by email or domain. EMAIL targets the specific booker email. DOMAIN targets all emails from the same domain.",
    example: ReportBookingTypeEnum.EMAIL,
  })
  reportType!: ReportBookingTypeEnum;
}
