import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, MinLength } from "class-validator";

import { BaseOrgRoleInput } from "./base-org-role.input";

export class UpdateOrgRoleInput extends BaseOrgRoleInput {
  @ApiPropertyOptional({ description: "Name of the role", minLength: 1 })
  @IsString()
  @MinLength(1)
  @IsOptional()
  name?: string;
}
