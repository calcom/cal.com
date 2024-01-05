import { IsString } from "class-validator";

import { TimeZone } from "@calcom/platform-constants";

export class CreateScheduleInput {
  @IsString()
  name!: string;

  @IsString()
  timeZone!: TimeZone;
}
