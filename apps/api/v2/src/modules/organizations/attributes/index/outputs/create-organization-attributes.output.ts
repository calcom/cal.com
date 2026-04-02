import { Expose, Type } from "class-transformer";
import { ValidateNested } from "class-validator";
import { Attribute } from "@/modules/organizations/attributes/index/outputs/attribute.output";
import { BaseOutputDTO } from "@/modules/organizations/attributes/index/outputs/base.output";

export class CreateOrganizationAttributesOutput extends BaseOutputDTO {
  @Expose()
  @ValidateNested()
  @Type(() => Attribute)
  data!: Attribute;
}
