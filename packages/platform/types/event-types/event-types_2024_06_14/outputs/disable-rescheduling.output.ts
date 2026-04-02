import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, Min } from "class-validator";

export class DisableReschedulingOutput_2024_06_14 {
  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({
    description: "If true, rescheduling is always disabled for this event type.",
    example: true,
  })
  disabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @ApiPropertyOptional({
    description:
      "Rescheduling is disabled when less than the specified number of minutes before the meeting.",
    example: 60,
  })
  minutesBefore?: number;
}
