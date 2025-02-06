import { BaseOutputDTO } from "@/modules/organizations/outputs/attributes/base.output";
import { OptionOutput } from "@/modules/organizations/outputs/attributes/options/option.output";
import { Expose, Type } from "class-transformer";
import { ValidateNested } from "class-validator";

export class DeleteAttributeOptionOutput extends BaseOutputDTO {
  @Expose()
  @ValidateNested()
  @Type(() => OptionOutput)
  data!: OptionOutput;
}
