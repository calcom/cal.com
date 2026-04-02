import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";
import { BaseTeamRoleInput } from "./base-team-role.input";

export class CreateTeamRoleInput extends BaseTeamRoleInput {
  @ApiProperty({ description: "Name of the role", minLength: 1 })
  @IsString()
  @MinLength(1)
  name!: string;
}
