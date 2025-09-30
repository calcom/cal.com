import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";

import {
  disableStandardEmailsToAttendeesDescription,
  disableStandardEmailsToHostsDescription,
} from "../inputs/email-settings.input";

export class EmailSettingsOutput_2024_06_14 {
  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({
    description: disableStandardEmailsToAttendeesDescription,
  })
  disableStandardEmailsToAttendees?: boolean;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional({
    description: disableStandardEmailsToHostsDescription,
  })
  disableStandardEmailsToHosts?: boolean;
}
