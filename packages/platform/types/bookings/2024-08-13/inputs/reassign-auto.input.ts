import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class ReassignAutoBookingInput_2024_08_13 {
  @IsString()
  @IsOptional()
  @ApiProperty({
    example: "Host is unavailable",
    required: false,
    description: "Reason for reassigning the booking",
  })
  reason?: string;
}
