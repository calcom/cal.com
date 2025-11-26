import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { ArrayNotEmpty, IsArray, IsOptional, IsString, Validate } from "class-validator";

import type { PermissionString } from "@calcom/platform-libraries/pbac";

import { orgPermissionEnum } from "../../inputs/base-org-role.input";
import { OrgPermissionStringValidator } from "./validators/org-permission-string.validator";

export class DeleteOrgRolePermissionsQuery {
  @ApiPropertyOptional({
    description:
      "Permissions to remove (format: resource.action). Supports comma-separated values as well as repeated query params.",
    example: "?permissions=eventType.read,booking.read",
    enum: orgPermissionEnum,
    isArray: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === "string") {
      return value
        .split(",")
        .map((p: string) => p.trim())
        .filter((p: string) => p.length > 0);
    }
    return value;
  })
  @IsArray()
  @ArrayNotEmpty({ message: "permissions cannot be empty." })
  @IsString({ each: true })
  @Validate(OrgPermissionStringValidator, { each: true })
  permissions?: PermissionString[];
}
