import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, MinLength } from "class-validator";

import { BaseTeamRoleInput } from "./base-team-role.input";

export class UpdateTeamRoleInput extends BaseTeamRoleInput {
  @ApiPropertyOptional({ description: "Name of the role", minLength: 1 })
  @IsString()
  @MinLength(1)
  @IsOptional()
  name?: string;
}
