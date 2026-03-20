import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsNumber, IsString } from "class-validator";

export class BlockOrgBookingData {
  @IsBoolean()
  @ApiProperty({
    description: "Whether the operation was successful",
    example: true,
  })
  success!: boolean;

  @IsString()
  @ApiProperty({
    description: "A human-readable message describing the result",
    example: "Added to blocklist and 3 bookings cancelled",
  })
  message!: string;

  @IsString()
  @ApiProperty({
    description: "The UID of the booking whose attendee was blocked",
    example: "booking-uid-123",
  })
  bookingUid!: string;

  @IsNumber()
  @ApiProperty({
    description: "The number of bookings cancelled",
    example: 3,
  })
  cancelledCount!: number;

  @IsString()
  @ApiProperty({
    description: "The email or domain that was added to the blocklist",
    example: "spammer@example.com",
  })
  blockedValue!: string;
}

export class BlockOrgBookingOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({ type: BlockOrgBookingData })
  data!: BlockOrgBookingData;
}
