import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

import { BaseTeamRoleInput } from "./base-team-role.input";

export class CreateTeamRoleInput extends BaseTeamRoleInput {
  @ApiProperty({ description: "Name of the role" })
  @IsString()
  name!: string;
}
