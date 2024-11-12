import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class CancelBookingInput_2024_08_13 {
  @IsString()
  @IsOptional()
  @ApiProperty({ example: "User requested cancellation" })
  cancellationReason?: string;
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
