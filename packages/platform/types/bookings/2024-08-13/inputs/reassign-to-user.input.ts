import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class ReassignToUserBookingInput_2024_08_13 {
  @IsString()
  @IsOptional()
  @ApiProperty({
    example: "Host has to take another call",
    required: false,
    description: "Reason for reassigning the booking",
  })
  reason?: string;
}
