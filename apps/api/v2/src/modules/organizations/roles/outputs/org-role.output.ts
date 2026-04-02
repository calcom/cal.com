import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { IsArray, IsDateString, IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import { orgPermissionEnum } from "../inputs/base-org-role.input";

enum RoleTypeEnum {
  SYSTEM = "SYSTEM",
  CUSTOM = "CUSTOM",
}

type RoleType = keyof typeof RoleTypeEnum;

export class OrgRoleOutput {
  @ApiProperty({ description: "Unique identifier for the role" })
  @IsString()
  @Expose()
  id!: string;

  @ApiProperty({ description: "Name of the role" })
  @IsString()
  @Expose()
  name!: string;

  @ApiPropertyOptional({ description: "Color for the role (hex code)" })
  @IsString()
  @IsOptional()
  @Expose()
  color?: string | null;

  @ApiPropertyOptional({ description: "Description of the role" })
  @IsString()
  @IsOptional()
  @Expose()
  description?: string | null;

  @ApiPropertyOptional({ description: "Organization ID this role belongs to" })
  @IsNumber()
  @IsOptional()
  @Expose()
  organizationId?: number | null;

  @ApiProperty({
    description: "Type of role",
    enum: RoleTypeEnum,
  })
  @IsEnum(RoleTypeEnum)
  @Expose()
  type!: RoleType;

  @ApiProperty({
    description: "Permissions assigned to this role in 'resource.action' format.",
    enum: orgPermissionEnum,
    isArray: true,
    example: ["booking.read", "eventType.create"],
  })
  @IsArray()
  @IsString({ each: true })
  @Expose()
  permissions!: string[];

  @ApiProperty({ description: "When the role was created" })
  @IsDateString()
  @Expose()
  createdAt!: string;

  @ApiProperty({ description: "When the role was last updated" })
  @IsDateString()
  @Expose()
  updatedAt!: string;
}
