import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional } from "class-validator";

import { BaseTeamRoleInput } from "./base-team-role.input";

export class UpdateTeamRoleInput extends BaseTeamRoleInput {
  @ApiPropertyOptional({ description: "Name of the role" })
  @IsString()
  @IsOptional()
  name?: string;
}
