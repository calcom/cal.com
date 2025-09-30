import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";

export class EmailSettingsOutput_2024_06_14 {
  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({
    description:
      "Disables standard email communication related to this event type, including booking confirmations, reminders, and cancellations.",
  })
  disableStandardEmailsToAttendees?: boolean;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({
    description:
      "Disables standard email communication related to this event type, including booking confirmations, reminders, and cancellations.",
  })
  disableStandardEmailsToHosts?: boolean;
}
