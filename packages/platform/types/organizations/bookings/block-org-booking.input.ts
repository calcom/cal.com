import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsString } from "class-validator";
import { ReportBookingTypeEnum } from "./report-org-booking.input";

export class BlockOrgBookingInput {
  @IsString()
  @ApiProperty({
    description: "The UID of the booking whose attendee should be blocked",
    example: "booking-uid-123",
  })
  bookingUid!: string;

  @IsEnum(ReportBookingTypeEnum)
  @ApiProperty({
    enum: ReportBookingTypeEnum,
    description:
      "Whether to block by email or domain. EMAIL blocks the specific booker email. DOMAIN blocks all emails from the same domain.",
    example: ReportBookingTypeEnum.EMAIL,
  })
  blockType!: ReportBookingTypeEnum;
}
