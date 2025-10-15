import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional } from "class-validator";

import { BaseRoleInput } from "./base-role.input";

export class UpdateRoleInput extends BaseRoleInput {
  @ApiPropertyOptional({ description: "Name of the role" })
  @IsString()
  @IsOptional()
  name?: string;
}
