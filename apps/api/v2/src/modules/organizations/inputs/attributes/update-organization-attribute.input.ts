import { IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";

import { AttributeType } from "@calcom/prisma/client";

export class UpdateOrganizationAttributeInput {
  @IsString()
  @IsOptional()
  readonly name?: string;

  @IsString()
  @IsOptional()
  readonly slug?: string;

  @IsEnum(AttributeType)
  @IsOptional()
  readonly type?: AttributeType;

  @IsBoolean()
  @IsOptional()
  readonly enabled?: boolean;
}
