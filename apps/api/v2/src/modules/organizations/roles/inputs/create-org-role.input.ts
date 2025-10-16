import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

import { BaseOrgRoleInput } from "./base-org-role.input";

export class CreateOrgRoleInput extends BaseOrgRoleInput {
  @ApiProperty({ description: "Name of the role" })
  @IsString()
  name!: string;
}
