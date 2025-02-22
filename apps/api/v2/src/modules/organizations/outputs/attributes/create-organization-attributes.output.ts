import { Attribute } from "@/modules/organizations/outputs/attributes/attribute.output";
import { BaseOutputDTO } from "@/modules/organizations/outputs/attributes/base.output";
import { Expose, Type } from "class-transformer";
import { ValidateNested } from "class-validator";

export class CreateOrganizationAttributesOutput extends BaseOutputDTO {
  @Expose()
  @ValidateNested()
  @Type(() => Attribute)
  data!: Attribute;
}
