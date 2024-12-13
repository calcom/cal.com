import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString } from "class-validator";

export class CancelBookingInput_2024_08_13 {
  @IsString()
  @IsOptional()
  @ApiProperty({ example: "User requested cancellation" })
  cancellationReason?: string;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({
    description:
      "For recurring non-seated booking - if true, cancel booking with the bookingUid of the individual recorrence and all recurrences that come after it.",
  })
  cancelSubsequentBookings?: boolean;
}

export class CancelSeatedBookingInput_2024_08_13 {
  @ApiProperty({
    type: String,
    example: "3be561a9-31f1-4b8e-aefc-9d9a085f0dd1",
    description: "Uid of the specific seat withing booking.",
  })
  @IsString()
  seatUid!: string;
}
