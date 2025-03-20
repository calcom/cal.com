import { Expose, Type } from "class-transformer";
import { ValidateNested } from "class-validator";

import { Attribute } from "../../../../organizations/attributes/index/outputs/attribute.output";
import { BaseOutputDTO } from "../../../../organizations/attributes/index/outputs/base.output";

export class DeleteOrganizationAttributesOutput extends BaseOutputDTO {
  @Expose()
  @ValidateNested()
  @Type(() => Attribute)
  data!: Attribute;
}
