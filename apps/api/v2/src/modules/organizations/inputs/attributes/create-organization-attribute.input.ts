import { CreateOrganizationAttributeOptionInput } from "@/modules/organizations/inputs/attributes/options/create-organization-attribute-option.input";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";

enum AttributeType {
  TEXT = "TEXT",
  SINGLE_SELECT = "SINGLE_SELECT",
  MULTI_SELECT = "MULTI_SELECT",
  NUMBER = "NUMBER",
}

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

  @IsArray()
  @ValidateNested()
  @Type(() => CreateOrganizationAttributeOptionInput)
  readonly options!: CreateOrganizationAttributeOptionInput[];

  @IsBoolean()
  @IsOptional()
  readonly enabled?: boolean;
}
