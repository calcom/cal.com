import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";

import { AttributeType } from "@calcom/prisma/enums";

export class CreateOrganizationAttributeInput {
  @IsString()
  @IsNotEmpty()
  readonly name!: string;

  @IsString()
  @IsNotEmpty()
  readonly slug!: string;

  @IsEnum(AttributeType)
  @IsNotEmpty()
  readonly type!: AttributeType;

  @IsString({ each: true })
  @IsOptional()
  readonly options?: string[];

  @IsBoolean()
  @IsOptional()
  readonly enabled?: boolean;
}
