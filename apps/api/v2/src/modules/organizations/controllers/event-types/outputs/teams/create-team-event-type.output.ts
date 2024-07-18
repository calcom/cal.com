import { Type } from "class-transformer";
import { IsNotEmptyObject, ValidateNested } from "class-validator";

import { ApiResponseWithoutData, TeamEventTypeOutput_2024_06_14 } from "@calcom/platform-types";

export class CreateTeamEventTypeOutput extends ApiResponseWithoutData {
  @IsNotEmptyObject()
  @ValidateNested()
  @Type(() => TeamEventTypeOutput_2024_06_14)
  data!: TeamEventTypeOutput_2024_06_14 | TeamEventTypeOutput_2024_06_14[];
}
