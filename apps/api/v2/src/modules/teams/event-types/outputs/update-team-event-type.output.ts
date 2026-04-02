import { ApiResponseWithoutData, TeamEventTypeOutput_2024_06_14 } from "@calcom/platform-types";
import { ApiExtraModels, ApiProperty, getSchemaPath } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsNotEmptyObject, ValidateNested } from "class-validator";

@ApiExtraModels(TeamEventTypeOutput_2024_06_14)
export class UpdateTeamEventTypeOutput extends ApiResponseWithoutData {
  @IsNotEmptyObject()
  @ValidateNested()
  @ApiProperty({
    oneOf: [
      { $ref: getSchemaPath(TeamEventTypeOutput_2024_06_14) },
      {
        type: "array",
        items: { $ref: getSchemaPath(TeamEventTypeOutput_2024_06_14) },
      },
    ],
  })
  @Type(() => TeamEventTypeOutput_2024_06_14)
  data!: TeamEventTypeOutput_2024_06_14 | TeamEventTypeOutput_2024_06_14[];
}
