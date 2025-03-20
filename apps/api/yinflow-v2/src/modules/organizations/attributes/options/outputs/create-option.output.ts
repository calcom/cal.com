import { Expose, Type } from "class-transformer";
import { ValidateNested } from "class-validator";

import { BaseOutputDTO } from "../../../../organizations/attributes/index/outputs/base.output";
import { OptionOutput } from "../../../../organizations/attributes/options/outputs/option.output";

export class CreateAttributeOptionOutput extends BaseOutputDTO {
  @Expose()
  @ValidateNested()
  @Type(() => OptionOutput)
  data!: OptionOutput;
}
