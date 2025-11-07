import { TeamRoleOutput } from "@/modules/organizations/teams/roles/outputs/team-role.output";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsArray, ValidateNested } from "class-validator";

import { SUCCESS_STATUS, ERROR_STATUS } from "@calcom/platform-constants";

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
