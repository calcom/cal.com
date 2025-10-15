import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsString, Validate } from "class-validator";

import type { PermissionString } from "@calcom/platform-libraries/pbac";

import { PermissionStringValidator } from "./validators/permission-string.validator";

export class CreateRolePermissionsInput {
  @ApiProperty({
    description: "Permissions to add (format: resource.action)",
    type: [String],
    example: ["eventType.read", "booking.read"],
  })
  @IsArray()
  @IsString({ each: true })
  @Validate(PermissionStringValidator, { each: true })
  permissions!: PermissionString[];
}
