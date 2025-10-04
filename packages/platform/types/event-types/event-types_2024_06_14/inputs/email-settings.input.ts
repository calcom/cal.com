import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";

export class EmailSettings_2024_06_14 {
  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({
    description:
      "Disables all email communication to attendees for this event type, including booking confirmations, reminders, and cancellations. This DOES NOT include emails sent by custom email workflows.",
  })
  disableEmailsToAttendees?: boolean;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({
    description:
      "Disables all email communication to hosts for this event type, including booking confirmations, reminders, and cancellations. This DOES NOT include emails sent by custom email workflows.",
  })
  disableEmailsToHosts?: boolean;
}
