import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";
import { TeamOutputDto } from "@calcom/platform-types";
import { ApiExtraModels, ApiProperty, getSchemaPath } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsEnum, IsString, IsUrl, ValidateNested } from "class-validator";

class CreateTeamOutputData {
  @Expose()
  @IsString()
  message!: string;

  @Expose()
  @IsUrl()
  paymentLink!: string;

  @Expose()
  @ValidateNested()
  pendingTeam!: TeamOutputDto;
}

@ApiExtraModels(TeamOutputDto, CreateTeamOutputData)
export class CreateTeamOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    oneOf: [{ $ref: getSchemaPath(CreateTeamOutputData) }, { $ref: getSchemaPath(TeamOutputDto) }],
    description: "Either an Output object or a TeamOutputDto.",
  })
  @Expose()
  @ValidateNested()
  data!: CreateTeamOutputData | TeamOutputDto;
}
