import { ApiResponseWithoutData, TeamEventTypeOutput_2024_06_14 } from "@calcom/platform-types";
import { Type } from "class-transformer";
import { ValidateNested } from "class-validator";

export class DeleteTeamEventTypeOutput extends ApiResponseWithoutData {
  @ValidateNested()
  @Type(() => TeamEventTypeOutput_2024_06_14)
  data!: Pick<TeamEventTypeOutput_2024_06_14, "id" | "title">;
}
