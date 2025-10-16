import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsOptional, IsString, Validate } from "class-validator";

import type { PermissionString } from "@calcom/platform-libraries/pbac";
import { getAllPermissionStringsForScope, Scope } from "@calcom/platform-libraries/pbac";

import { OrgPermissionStringValidator } from "../permissions/inputs/validators/org-permission-string.validator";

export const orgPermissionEnum = [...getAllPermissionStringsForScope(Scope.Organization)] as const;

export class BaseOrgRoleInput {
  @ApiPropertyOptional({ description: "Color for the role (hex code)" })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({ description: "Description of the role" })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description:
      "Permissions for this role (format: resource.action). On update, this field replaces the entire permission set for the role (full replace). Use granular permission endpoints for one-by-one changes.",
    enum: orgPermissionEnum,
    isArray: true,
    example: ["eventType.read", "eventType.create", "booking.read"],
  })
  @IsArray()
  @IsString({ each: true })
  @Validate(OrgPermissionStringValidator, { each: true })
  @IsOptional()
  permissions?: PermissionString[];
}
