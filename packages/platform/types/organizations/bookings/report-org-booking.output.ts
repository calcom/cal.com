import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsNumber, IsString } from "class-validator";

export class ReportOrgBookingData {
  @IsBoolean()
  @ApiProperty({
    description: "Whether the operation was successful",
    example: true,
  })
  success!: boolean;

  @IsString()
  @ApiProperty({
    description: "A human-readable message describing the result",
    example: "Booking reported and cancelled successfully",
  })
  message!: string;

  @IsString()
  @ApiProperty({
    description: "The UID of the reported booking",
    example: "booking-uid-123",
  })
  bookingUid!: string;

  @IsNumber()
  @ApiProperty({
    description: "The number of booking reports created",
    example: 1,
  })
  reportedCount!: number;

  @IsNumber()
  @ApiProperty({
    description: "The number of bookings cancelled",
    example: 3,
  })
  cancelledCount!: number;
}

export class ReportOrgBookingOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({ type: ReportOrgBookingData })
  data!: ReportOrgBookingData;
}
