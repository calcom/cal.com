import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";

export class DisableCancellingOutput_2024_06_14 {
  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({
    description: "If true, cancelling is always disabled for this event type.",
    example: true,
  })
  disabled?: boolean;

  // Note: minutesBefore can be added later when the feature is implemented for cancelling
}
