import { BaseOutputDTO } from "@/modules/organizations/outputs/attributes/base.output";
import { OptionOutput } from "@/modules/organizations/outputs/attributes/options/option.output";
import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsString, ValidateNested } from "class-validator";

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
