import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";
import { BaseOrgRoleInput } from "./base-org-role.input";

export class CreateOrgRoleInput extends BaseOrgRoleInput {
  @ApiProperty({ description: "Name of the role", minLength: 1 })
  @IsString()
  @MinLength(1)
  name!: string;
}
