import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsOptional, ValidateNested } from "class-validator";
import { Attribute } from "@/modules/organizations/attributes/index/outputs/attribute.output";
import { BaseOutputDTO } from "@/modules/organizations/attributes/index/outputs/base.output";

export class GetSingleAttributeOutput extends BaseOutputDTO {
  @Expose()
  @ValidateNested()
  @IsOptional()
  @Type(() => Attribute)
  @ApiProperty({ type: Attribute, nullable: true })
  data!: Attribute | null;
}

export class GetOrganizationAttributesOutput extends BaseOutputDTO {
  @Expose()
  @ValidateNested({ each: true })
  @Type(() => Attribute)
  @ApiProperty({ type: [Attribute] })
  data!: Attribute[];
}
