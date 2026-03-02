import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class RequestRescheduleInput_2024_08_13 {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional({
    example: "I need to reschedule due to a conflict",
    description: "Reason for requesting to reschedule the booking",
  })
  rescheduleReason?: string;
}
