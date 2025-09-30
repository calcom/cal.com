import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";

export class EmailSettings_2024_06_14 {
  @IsBoolean()
  @IsOptional()
  @ApiProperty({
    description:
      "Disables standard email communication related to this event type, including booking confirmations, reminders, and cancellations.",
    required: false,
  })
  disableStandardEmailsToAttendees?: boolean;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({
    description:
      "Disables standard email communication related to this event type, including booking confirmations, reminders, and cancellations.",
    required: false,
  })
  disableStandardEmailsToHosts?: boolean;
}
