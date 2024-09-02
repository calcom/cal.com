import { Attribute } from "@/modules/organizations/outputs/attributes/attribute.output";
import { BaseOutputDTO } from "@/modules/organizations/outputs/attributes/base.output";
import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsBoolean, IsInt, IsString, IsEnum, ValidateNested, IsOptional } from "class-validator";

import { AttributeType } from "@calcom/prisma/client";

export class GetSingleAttributeOutput extends BaseOutputDTO {
  @Expose()
  @ValidateNested()
  @IsOptional()
  @Type(() => Attribute)
  data!: Attribute | null;
}

export class GetOrganizationAttributesOutput extends BaseOutputDTO {
  @Expose()
  @ValidateNested()
  @Type(() => Attribute)
  data!: Attribute[];
}
