import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsString, Validate } from "class-validator";

import type { PermissionString } from "@calcom/platform-libraries/pbac";

import { teamPermissionEnum } from "../../inputs/base-team-role.input";
import { TeamPermissionStringValidator } from "./validators/team-permission-string.validator";

export class CreateTeamRolePermissionsInput {
  @ApiProperty({
    description: "Permissions to add (format: resource.action)",
    enum: teamPermissionEnum,
    isArray: true,
    example: ["eventType.read", "booking.read"],
  })
  @IsArray()
  @IsString({ each: true })
  @Validate(TeamPermissionStringValidator, { each: true })
  permissions!: PermissionString[];
}
