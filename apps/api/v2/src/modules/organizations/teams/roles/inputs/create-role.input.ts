import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

import { BaseRoleInput } from "./base-role.input";

export class CreateRoleInput extends BaseRoleInput {
  @ApiProperty({ description: "Name of the role" })
  @IsString()
  name!: string;
}
