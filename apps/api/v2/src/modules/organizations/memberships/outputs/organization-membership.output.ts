import { ApiExtraModels, ApiProperty, getSchemaPath } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";
import { TeamMembershipOutput } from "@/modules/teams/memberships/outputs/team-membership.output";

class BaseAttribute {
  @IsString()
  @Expose()
  @ApiProperty()
  id!: string;

  @IsString()
  @Expose()
  @ApiProperty()
  name!: string;
}

export class TextAttribute extends BaseAttribute {
  @IsString()
  @Expose()
  @ApiProperty()
  type!: "text";

  @IsString()
  @Expose()
  @ApiProperty()
  option!: string;

  @IsString()
  @Expose()
  @ApiProperty()
  optionId!: string;
}

export class NumberAttribute extends BaseAttribute {
  @IsString()
  @Expose()
  @ApiProperty()
  type!: "number";

  @IsNumber()
  @Expose()
  @ApiProperty()
  option!: number;

  @IsString()
  @Expose()
  @ApiProperty()
  optionId!: string;
}

export class SingleSelectAttribute extends BaseAttribute {
  @IsString()
  @IsString()
  @Expose()
  @ApiProperty()
  type!: "singleSelect";

  @IsString()
  @Expose()
  @ApiProperty()
  option!: string;

  @IsString()
  @Expose()
  @ApiProperty()
  optionId!: string;
}

class MultiSelectAttributeOption {
  @IsString()
  @Expose()
  @ApiProperty()
  optionId!: string;

  @IsString()
  @Expose()
  @ApiProperty()
  option!: string;
}

export class MultiSelectAttribute extends BaseAttribute {
  @IsString()
  @Expose()
  @ApiProperty()
  type!: "multiSelect";

  @IsArray()
  @ValidateNested({ each: true })
  @Expose()
  @ApiProperty()
  options!: MultiSelectAttributeOption[];
}

export type OrgUserAttribute = TextAttribute | NumberAttribute | SingleSelectAttribute | MultiSelectAttribute;

@ApiExtraModels(BaseAttribute, TextAttribute, NumberAttribute, SingleSelectAttribute, MultiSelectAttribute)
export class OrganizationMembershipOutput extends TeamMembershipOutput {
  @IsArray()
  @ValidateNested({ each: true })
  @Expose()
  @ApiProperty({
    required: true,
    oneOf: [
      { $ref: getSchemaPath(TextAttribute) },
      { $ref: getSchemaPath(NumberAttribute) },
      { $ref: getSchemaPath(SingleSelectAttribute) },
      { $ref: getSchemaPath(MultiSelectAttribute) },
    ],
    type: "array",
  })
  @Type(() => Object)
  attributes!: OrgUserAttribute[];
}
