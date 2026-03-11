import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from "class-validator";

class ReportBookingSpamData {
  @ApiProperty({ description: "The UID of the reported booking" })
  @IsString()
  bookingUid!: string;

  @ApiProperty({ description: "Number of booking reports created" })
  @IsNumber()
  reportedCount!: number;

  @ApiProperty({ description: "Number of bookings cancelled" })
  @IsNumber()
  cancelledCount!: number;

  @ApiProperty({ description: "Whether the booker email was added to the organization blocklist" })
  @IsBoolean()
  blocklisted!: boolean;

  @ApiPropertyOptional({ description: "Additional details about the result" })
  @IsOptional()
  @IsString()
  message?: string;
}

export class ReportBookingSpamOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({ type: ReportBookingSpamData })
  data!: ReportBookingSpamData;
}
