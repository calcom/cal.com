import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsString, ValidateNested } from "class-validator";
import { BaseOutputDTO } from "@/modules/organizations/attributes/index/outputs/base.output";
import { OptionOutput } from "@/modules/organizations/attributes/options/outputs/option.output";

class AssignOptionUserOutputData {
  @IsString()
  @ApiProperty({ type: String, required: true, description: "The ID of the option assigned to the user" })
  id!: string;

  @IsString()
  @ApiProperty({ type: Number, required: true, description: "The ID form the org membership for the user" })
  memberId!: number;

  @IsString()
  @ApiProperty({ type: String, required: true, description: "The value of the option" })
  attributeOptionId!: string;
}

export class AssignOptionUserOutput extends BaseOutputDTO {
  @Expose()
  @ValidateNested()
  @Type(() => AssignOptionUserOutputData)
  data!: AssignOptionUserOutputData;
}

export class UnassignOptionUserOutput extends BaseOutputDTO {
  @Expose()
  @ValidateNested()
  @Type(() => AssignOptionUserOutputData)
  data!: AssignOptionUserOutputData;
}
