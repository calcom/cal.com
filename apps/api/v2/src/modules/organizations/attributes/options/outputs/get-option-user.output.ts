import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsString, ValidateNested } from "class-validator";
import { BaseOutputDTO } from "@/modules/organizations/attributes/index/outputs/base.output";

class GetOptionUserOutputData {
  @IsString()
  @ApiProperty({ type: String, required: true, description: "The ID of the option assigned to the user" })
  id!: string;

  @IsString()
  @ApiProperty({ type: String, required: true, description: "The ID of the attribute" })
  attributeId!: string;

  @IsString()
  @ApiProperty({ type: String, required: true, description: "The value of the option" })
  value!: string;

  @IsString()
  @ApiProperty({ type: String, required: true, description: "The slug of the option" })
  slug!: string;
}

export class GetOptionUserOutput extends BaseOutputDTO {
  @Expose()
  @ValidateNested()
  @Type(() => GetOptionUserOutputData)
  data!: GetOptionUserOutputData[];
}
