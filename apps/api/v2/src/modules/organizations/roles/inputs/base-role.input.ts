import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsOptional, IsString, Validate } from "class-validator";

import type { PermissionString } from "@calcom/platform-libraries/pbac";

import { PermissionStringValidator } from "../validators/permission-string.validator";

export class BaseRoleInput {
  @ApiPropertyOptional({ description: "Color for the role (hex code)" })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({ description: "Description of the role" })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: "Permissions for this role (format: resource.action)",
    type: [String],
    example: ["eventType.read", "eventType.create", "booking.read"],
  })
  @IsArray()
  @IsString({ each: true })
  @Validate(PermissionStringValidator, { each: true })
  @IsOptional()
  permissions?: PermissionString[];
}
