import type { PermissionString } from "@calcom/platform-libraries/pbac";
import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsString, Validate } from "class-validator";
import { orgPermissionEnum } from "../../inputs/base-org-role.input";
import { OrgPermissionStringValidator } from "./validators/org-permission-string.validator";

export class CreateOrgRolePermissionsInput {
  @ApiProperty({
    description: "Permissions to add (format: resource.action)",
    enum: orgPermissionEnum,
    isArray: true,
    example: ["eventType.read", "booking.read"],
  })
  @IsArray()
  @IsString({ each: true })
  @Validate(OrgPermissionStringValidator, { each: true })
  permissions!: PermissionString[];
}
