import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional } from "class-validator";

import { BaseOrgRoleInput } from "./base-org-role.input";

export class UpdateOrgRoleInput extends BaseOrgRoleInput {
  @ApiPropertyOptional({ description: "Name of the role" })
  @IsString()
  @IsOptional()
  name?: string;
}
