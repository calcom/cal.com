import { BaseOutputDTO } from "@/modules/organizations/attributes/index/outputs/base.output";
import { OptionOutput } from "@/modules/organizations/attributes/options/outputs/option.output";
import { Expose, Type } from "class-transformer";
import { ValidateNested } from "class-validator";

export class UpdateAttributeOptionOutput extends BaseOutputDTO {
  @Expose()
  @ValidateNested()
  @Type(() => OptionOutput)
  data!: OptionOutput;
}
