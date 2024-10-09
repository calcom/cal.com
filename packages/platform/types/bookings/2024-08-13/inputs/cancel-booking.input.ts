import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class CancelBookingInput_2024_08_13 {
  @IsString()
  @IsOptional()
  @ApiProperty({ example: "User requested cancellation" })
  cancellationReason?: string;
}
