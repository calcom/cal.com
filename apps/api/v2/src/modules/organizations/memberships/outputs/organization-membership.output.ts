import { TeamMembershipOutput } from "@/modules/teams/memberships/outputs/team-membership.output";
import { ApiExtraModels, ApiProperty, getSchemaPath } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";

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
  value!: string;

  @IsString()
  @Expose()
  @ApiProperty()
  valueId!: string;
}

export class NumberAttribute extends BaseAttribute {
  @IsString()
  @Expose()
  @ApiProperty()
  type!: "number";

  @IsNumber()
  @Expose()
  @ApiProperty()
  value!: number;

  @IsString()
  @Expose()
  @ApiProperty()
  valueId!: string;
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
  value!: string;

  @IsString()
  @Expose()
  @ApiProperty()
  valueId!: string;
}

class MultiSelectAttributeValue {
  @IsString()
  @Expose()
  @ApiProperty()
  valueId!: string;

  @IsString()
  @Expose()
  @ApiProperty()
  value!: string;
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
  values!: MultiSelectAttributeValue[];
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
