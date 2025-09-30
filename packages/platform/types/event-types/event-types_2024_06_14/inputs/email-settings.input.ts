import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";

export const disableStandardEmailsToAttendeesDescription =
  "Disables standard email communication to attendees for this event type, including booking confirmations, reminders, and cancellations.";
export const disableStandardEmailsToHostsDescription =
  "Disables standard email communication to hosts for this event type, including booking confirmations, reminders, and cancellations.";

export class EmailSettings_2024_06_14 {
  @IsBoolean()
  @IsOptional()
  @ApiProperty({
    description: disableStandardEmailsToAttendeesDescription,
    required: false,
  })
  disableStandardEmailsToAttendees?: boolean;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({
    description: disableStandardEmailsToHostsDescription,
    required: false,
  })
  disableStandardEmailsToHosts?: boolean;
}
