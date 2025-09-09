import { CreateOrganizationAttributeOptionInput } from "@/modules/organizations/attributes/options/inputs/create-organization-attribute-option.input";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
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

import { AttributeType } from "@calcom/platform-libraries";

export class CreateOrganizationAttributeInput {
  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  readonly name!: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty()
  readonly slug!: string;

  @IsEnum(AttributeType)
  @IsNotEmpty()
  @ApiProperty({ enum: AttributeType })
  readonly type!: AttributeType;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrganizationAttributeOptionInput)
  @ApiProperty({ type: [CreateOrganizationAttributeOptionInput] })
  readonly options!: CreateOrganizationAttributeOptionInput[];

  @IsBoolean()
  @IsOptional()
  @ApiPropertyOptional()
  readonly enabled?: boolean;
}
