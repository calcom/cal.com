import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEnum,
  IsDateString,
  IsNumber,
} from "class-validator";

enum RoleTypeEnum {
  SYSTEM = "SYSTEM",
  CUSTOM = "CUSTOM",
}

type RoleType = keyof typeof RoleTypeEnum;

export class RolePermissionOutput {
  @ApiProperty({ description: "Unique identifier for the permission" })
  @IsString()
  @Expose()
  id!: string;

  @ApiProperty({ description: "The resource this permission applies to" })
  @IsString()
  @Expose()
  resource!: string;

  @ApiProperty({ description: "The action this permission allows" })
  @IsString()
  @Expose()
  action!: string;

  @ApiProperty({ description: "When the permission was created" })
  @IsDateString()
  @Expose()
  createdAt!: string;
}

export class RoleOutput {
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

  @ApiPropertyOptional({ description: "Team/Organization ID this role belongs to" })
  @IsNumber()
  @IsOptional()
  @Expose()
  teamId?: number | null;

  @ApiProperty({
    description: "Type of role",
    enum: RoleTypeEnum,
  })
  @IsEnum(RoleTypeEnum)
  @Expose()
  type!: RoleType;

  @ApiProperty({
    description: "Permissions assigned to this role",
    type: [RolePermissionOutput],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RolePermissionOutput)
  @Expose()
  permissions!: RolePermissionOutput[];

  @ApiProperty({ description: "When the role was created" })
  @IsDateString()
  @Expose()
  createdAt!: string;

  @ApiProperty({ description: "When the role was last updated" })
  @IsDateString()
  @Expose()
  updatedAt!: string;
}
