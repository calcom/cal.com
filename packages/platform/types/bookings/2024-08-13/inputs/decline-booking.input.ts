import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class DeclineBookingInput_2024_08_13 {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    example: "Host has to take another call",
    description: "Reason for declining a booking that requires a confirmation",
  })
  reason?: string;
}
