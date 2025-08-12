import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class ReassignToUserBookingInput_2024_08_13 {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    example: "Host has to take another call",
    description: "Reason for reassigning the booking",
  })
  reason?: string;
}
