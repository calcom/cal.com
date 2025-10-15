import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { ArrayNotEmpty, IsArray, IsOptional, IsString, Validate } from "class-validator";

import type { PermissionString } from "@calcom/platform-libraries/pbac";

import { PermissionStringValidator } from "./validators/permission-string.validator";

export class DeleteRolePermissionsQuery {
  @ApiPropertyOptional({
    description:
      "Permissions to remove (format: resource.action). Supports comma-separated values as well as repeated query params.",
    example: "?permissions=eventType.read,booking.read",
    type: [String],
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
  @Validate(PermissionStringValidator, { each: true })
  permissions?: PermissionString[];
}
