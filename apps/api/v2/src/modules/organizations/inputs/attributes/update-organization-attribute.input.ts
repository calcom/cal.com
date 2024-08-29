import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";

import { AttributeType } from "@calcom/prisma/enums";

export class UpdateOrganizationAttributeInput {
  @IsString()
  @IsNotEmpty()
  readonly name!: string;

  @IsString()
  @IsNotEmpty()
  readonly slug!: string;

  @IsEnum(AttributeType)
  @IsNotEmpty()
  readonly type!: AttributeType;

  @IsBoolean()
  @IsOptional()
  readonly enabled?: boolean;
}
