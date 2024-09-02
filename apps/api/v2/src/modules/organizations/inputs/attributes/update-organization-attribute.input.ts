import { IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";

export const AttributeType = {
  TEXT: "TEXT",
  NUMBER: "NUMBER",
  SINGLE_SELECT: "SINGLE_SELECT",
  MULTI_SELECT: "MULTI_SELECT",
} as const;

export type AttributeType = (typeof AttributeType)[keyof typeof AttributeType];

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
