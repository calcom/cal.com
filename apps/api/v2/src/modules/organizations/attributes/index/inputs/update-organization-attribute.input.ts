import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";

import { AttributeType } from "@calcom/platform-libraries";

export class UpdateOrganizationAttributeInput {
  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  readonly name?: string;

  @IsString()
  @IsOptional()
  @ApiPropertyOptional()
  readonly slug?: string;

  @IsEnum(AttributeType)
  @IsOptional()
  @ApiPropertyOptional({ enum: AttributeType })
  readonly type?: AttributeType;

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional()
  readonly enabled?: boolean;
}
