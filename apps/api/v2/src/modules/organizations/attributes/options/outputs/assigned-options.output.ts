import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsArray, ValidateNested } from "class-validator";
import { BaseOutputDTO } from "@/modules/organizations/attributes/index/outputs/base.output";
import { OptionOutput } from "@/modules/organizations/attributes/options/outputs/option.output";

export class AssignedOptionOutput extends OptionOutput {
  @Expose()
  @IsArray()
  @ApiProperty({
    type: Array,
    required: true,
    description: "Ids of the users assigned to the attribute option.",
    example: [124, 224],
  })
  assignedUserIds!: number[];
}

export class GetAllAttributeAssignedOptionOutput extends BaseOutputDTO {
  @Expose()
  @ValidateNested()
  @Type(() => OptionOutput)
  data!: AssignedOptionOutput[];
}
