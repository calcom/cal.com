import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator";

enum AttributeType {
  TEXT = "TEXT",
  SINGLE_SELECT = "SINGLE_SELECT",
  MULTI_SELECT = "MULTI_SELECT",
  NUMBER = "NUMBER",
}

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
