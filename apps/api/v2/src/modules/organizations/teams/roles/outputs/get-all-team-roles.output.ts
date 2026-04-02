import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsEnum, ValidateNested } from "class-validator";
import { TeamRoleOutput } from "@/modules/organizations/teams/roles/outputs/team-role.output";

export class GetAllTeamRolesOutput {
  @ApiProperty({ example: SUCCESS_STATUS, enum: [SUCCESS_STATUS, ERROR_STATUS] })
  @IsEnum([SUCCESS_STATUS, ERROR_STATUS])
  status!: typeof SUCCESS_STATUS | typeof ERROR_STATUS;

  @ApiProperty({
    type: [TeamRoleOutput],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeamRoleOutput)
  data!: TeamRoleOutput[];
}
