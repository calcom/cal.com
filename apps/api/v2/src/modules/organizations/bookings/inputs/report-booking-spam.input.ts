import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class ReportBookingSpamInput {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ApiPropertyOptional({
    description: "Optional description providing additional context about the spam report",
    example: "This booker sent promotional content in the booking notes",
  })
  readonly description?: string;
}
